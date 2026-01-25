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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      // Fetch study sessions from the last 7 days
      const { data: sessions, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("fecha", weekAgo.toISOString().split('T')[0])
        .order("fecha", { ascending: false });

      if (error) throw error;

      const todayStr = today.toISOString().split('T')[0];
      const todaySessions = sessions?.filter(s => s.fecha === todayStr) || [];
      const weekSessions = sessions || [];

      const studyMinutesToday = Math.round(
        todaySessions.reduce((acc, s) => acc + s.duracion_segundos, 0) / 60
      );
      const studyMinutesThisWeek = Math.round(
        weekSessions.reduce((acc, s) => acc + s.duracion_segundos, 0) / 60
      );

      // Calculate days since last study
      let daysSinceLastStudy = 7;
      if (sessions && sessions.length > 0) {
        const lastStudyDate = new Date(sessions[0].fecha);
        const diffTime = today.getTime() - lastStudyDate.getTime();
        daysSinceLastStudy = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      setStudyActivity({
        hasStudiedToday: studyMinutesToday > 0,
        hasStudiedThisWeek: studyMinutesThisWeek > 0,
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
    if (daysSincePlanted < 7) {
      // Plant is still in grace period - skip death check, only do growth
    } else if (studyActivity.daysSinceLastStudy >= 7 && currentPlant.is_alive) {
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
    if (studyActivity.hasStudiedToday && currentPlant.is_alive && !currentPlant.is_completed) {
      // Growth based on study time: 5% base + 1% per 30 minutes studied today
      const baseGrowth = 5;
      const bonusGrowth = Math.floor(studyActivity.studyMinutesToday / 30);
      const totalGrowth = Math.min(baseGrowth + bonusGrowth, 15); // Max 15% per day
      
      const newGrowth = Math.min(currentPlant.growth_percentage + totalGrowth, 100);
      const isCompleted = newGrowth >= 100;

      // Only update if there's actual growth
      if (newGrowth > currentPlant.growth_percentage) {
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
          }
          fetchPlants();
        }
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
    plantTypes: PLANT_TYPES,
    refetch: fetchPlants,
  };
}
