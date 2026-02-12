import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

// Hook para verificar logros (se llama externamente)
export const checkAchievementsAfterSubjectUpdate = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('check_and_unlock_achievements', { p_user_id: userId });

    if (error) {
      console.error("Error checking achievements:", error);
      return [];
    }

    const unlocked = (data || []) as { achievement_id: string; achievement_name: string; xp_reward: number }[];

    unlocked.forEach((achievement) => {
      toast.success(`🏆 ¡Logro desbloqueado!`, {
        description: `${achievement.achievement_name} (+${achievement.xp_reward} XP)`,
        duration: 5000,
      });
    });

    return unlocked;
  } catch (err) {
    console.error("Error in checkAchievementsAfterSubjectUpdate:", err);
    return [];
  }
};
export type SubjectStatus = "aprobada" | "regular" | "cursable" | "bloqueada" | "recursar";

export interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
  numero_materia: number;
}

export interface PartialGrades {
  nota_parcial_1?: number | null;
  nota_rec_parcial_1?: number | null;
  nota_parcial_2?: number | null;
  nota_rec_parcial_2?: number | null;
  nota_global?: number | null;
  nota_rec_global?: number | null;
  nota_final_examen?: number | null;
}

export interface UserSubjectStatus {
  id: string;
  subject_id: string;
  estado: SubjectStatus;
  nota: number | null;
  fecha_aprobacion: string | null;
  nota_parcial_1?: number | null;
  nota_rec_parcial_1?: number | null;
  nota_parcial_2?: number | null;
  nota_rec_parcial_2?: number | null;
  nota_global?: number | null;
  nota_rec_global?: number | null;
  nota_final_examen?: number | null;
}

export interface Dependency {
  id: string;
  subject_id: string;
  requiere_regular: string | null;
  requiere_aprobada: string | null;
}

export interface SubjectWithStatus extends Subject {
  status: SubjectStatus;
  nota: number | null;
  fecha_aprobacion: string | null;
  requisitos_faltantes: string[];
  dependencies: Dependency[];
  partialGrades: PartialGrades;
  userStatusId?: string;
}

export interface CreateSubjectData {
  nombre: string;
  codigo: string;
  año: number;
  requiere_regular?: string[];
  requiere_aprobada?: string[];
}

export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserSubjectStatus[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Run all 3 queries in parallel
      const [subjectsResult, statusResult, depsResult] = await Promise.all([
        supabase
          .from("subjects")
          .select("*")
          .order("año", { ascending: true })
          .order("numero_materia", { ascending: true }),
        supabase
          .from("user_subject_status")
          .select("*"),
        supabase
          .from("subject_dependencies")
          .select("*"),
      ]);

      if (subjectsResult.error) throw subjectsResult.error;
      if (statusResult.error) throw statusResult.error;
      if (depsResult.error) throw depsResult.error;

      setSubjects(subjectsResult.data || []);
      setUserStatuses((statusResult.data || []).map(s => ({
        ...s,
        estado: s.estado as SubjectStatus,
      })));
      setDependencies(depsResult.data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Error al cargar las materias");
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData(true);
    }
  }, [user, fetchData]);

  // Debounced refetch for realtime — avoids cascade re-renders
  const debouncedRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      fetchData(false); // Don't show loading spinner on realtime updates
    }, 300);
  }, [fetchData]);

  // Realtime subscription for user_subject_status changes
  useRealtimeSubscription({
    table: "user_subject_status",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      console.log("📡 Realtime: user_subject_status changed, refetching...");
      debouncedRefetch();
    }, [debouncedRefetch]),
    enabled: !!user,
  });

  // Pre-build lookup maps for O(1) access instead of repeated .find() calls
  const userStatusMap = useMemo(() => {
    const map = new Map<string, UserSubjectStatus>();
    for (const s of userStatuses) {
      map.set(s.subject_id, s);
    }
    return map;
  }, [userStatuses]);

  const dependenciesBySubject = useMemo(() => {
    const map = new Map<string, Dependency[]>();
    for (const d of dependencies) {
      const existing = map.get(d.subject_id);
      if (existing) {
        existing.push(d);
      } else {
        map.set(d.subject_id, [d]);
      }
    }
    return map;
  }, [dependencies]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) {
      map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  const getSubjectStatus = useCallback((subjectId: string): SubjectStatus => {
    const userStatus = userStatusMap.get(subjectId);
    if (userStatus) {
      return userStatus.estado;
    }

    const deps = dependenciesBySubject.get(subjectId) || [];
    if (deps.length === 0) {
      return "cursable";
    }

    const canTake = deps.every(dep => {
      if (dep.requiere_aprobada) {
        const reqStatus = userStatusMap.get(dep.requiere_aprobada);
        return reqStatus?.estado === "aprobada";
      }
      if (dep.requiere_regular) {
        const reqStatus = userStatusMap.get(dep.requiere_regular);
        return reqStatus?.estado === "aprobada" || reqStatus?.estado === "regular";
      }
      return true;
    });

    return canTake ? "cursable" : "bloqueada";
  }, [userStatusMap, dependenciesBySubject]);

  const getMissingRequirements = useCallback((subjectId: string): string[] => {
    const deps = dependenciesBySubject.get(subjectId) || [];
    const missing: string[] = [];

    for (const dep of deps) {
      if (dep.requiere_aprobada) {
        const reqStatus = userStatusMap.get(dep.requiere_aprobada);
        if (reqStatus?.estado !== "aprobada") {
          const subject = subjectMap.get(dep.requiere_aprobada);
          if (subject) missing.push(`${subject.numero_materia} aprobada`);
        }
      }
      if (dep.requiere_regular) {
        const reqStatus = userStatusMap.get(dep.requiere_regular);
        if (reqStatus?.estado !== "aprobada" && reqStatus?.estado !== "regular") {
          const subject = subjectMap.get(dep.requiere_regular);
          if (subject) missing.push(`${subject.numero_materia} regular`);
        }
      }
    }

    return missing;
  }, [dependenciesBySubject, userStatusMap, subjectMap]);

  // Memoize the full computed subjects list — only recalculates when data actually changes
  const subjectsWithStatus = useMemo((): SubjectWithStatus[] => {
    return subjects.map(subject => {
      const userStatus = userStatusMap.get(subject.id);
      const status = getSubjectStatus(subject.id);
      const subjectDeps = dependenciesBySubject.get(subject.id) || [];

      return {
        ...subject,
        status,
        nota: userStatus?.nota ?? null,
        fecha_aprobacion: userStatus?.fecha_aprobacion ?? null,
        requisitos_faltantes: status === "bloqueada" ? getMissingRequirements(subject.id) : [],
        dependencies: subjectDeps,
        userStatusId: userStatus?.id,
        partialGrades: {
          nota_parcial_1: userStatus?.nota_parcial_1 ?? null,
          nota_rec_parcial_1: userStatus?.nota_rec_parcial_1 ?? null,
          nota_parcial_2: userStatus?.nota_parcial_2 ?? null,
          nota_rec_parcial_2: userStatus?.nota_rec_parcial_2 ?? null,
          nota_global: userStatus?.nota_global ?? null,
          nota_rec_global: userStatus?.nota_rec_global ?? null,
          nota_final_examen: userStatus?.nota_final_examen ?? null,
        },
      };
    });
  }, [subjects, userStatusMap, dependenciesBySubject, getSubjectStatus, getMissingRequirements]);

  const updateSubjectStatus = async (
    subjectId: string,
    estado: SubjectStatus,
    nota?: number
  ) => {
    if (!user) return;

    try {
      const existingStatus = userStatuses.find(s => s.subject_id === subjectId);
      const previousEstado = existingStatus?.estado;

      const statusData = {
        user_id: user.id,
        subject_id: subjectId,
        estado,
        nota: nota ?? null,
        fecha_aprobacion: estado === "aprobada" ? new Date().toISOString().split('T')[0] : null,
      };

      if (existingStatus) {
        const { error } = await supabase
          .from("user_subject_status")
          .update(statusData)
          .eq("id", existingStatus.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_subject_status")
          .insert(statusData);

        if (error) throw error;
      }

      // Award XP for status changes (only if status actually changed)
      if (previousEstado !== estado) {
        let xpToAdd = 0;

        if (estado === "aprobada") {
          xpToAdd = 100; // 100 XP por aprobar materia
        } else if (estado === "regular") {
          xpToAdd = 50; // 50 XP por regularizar materia
        }

        if (xpToAdd > 0) {
          // Get current stats
          const { data: currentStats } = await supabase
            .from("user_stats")
            .select("xp_total, nivel, credits")
            .eq("user_id", user.id)
            .single();

          if (currentStats) {
            const stats = currentStats as any;
            const newXpTotal = (stats.xp_total || 0) + xpToAdd;
            const creditsToAdd = Math.floor(xpToAdd / 2); // 50% of XP as Credits
            const newCredits = (stats.credits || 0) + creditsToAdd;

            // Calculate new level: every 100 XP = 1 level
            const newLevel = Math.floor(newXpTotal / 100) + 1;
            const leveledUp = newLevel > (stats.nivel || 1);

            await supabase
              .from("user_stats")
              .update({
                xp_total: newXpTotal,
                nivel: newLevel,
                credits: newCredits
              })
              .eq("user_id", user.id);

            const statusLabel = estado === "aprobada" ? "aprobar" : "regularizar";
            toast.success(`+${xpToAdd} XP y +${creditsToAdd} Créditos por ${statusLabel} la materia! 🎉`);

            if (leveledUp) {
              toast.success(`🎮 ¡Subiste al nivel ${newLevel}!`, {
                duration: 5000,
              });
            }
          }

          // Check achievements after XP update
          await supabase.rpc('check_and_unlock_achievements', { p_user_id: user.id });
        }
      }

      await fetchData(false);
      toast.success("Estado actualizado correctamente");

      // Verificar logros después de actualizar estado de materia
      await checkAchievementsAfterSubjectUpdate(user.id);
    } catch (error) {
      console.error("Error updating subject status:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const createSubject = async (data: CreateSubjectData) => {
    if (!user) return;

    try {
      // Get the next numero_materia for the year
      const subjectsInYear = subjects.filter(s => s.año === data.año);
      const nextNumero = subjectsInYear.length > 0
        ? Math.max(...subjectsInYear.map(s => s.numero_materia)) + 1
        : 1;

      // Create the subject
      const { data: newSubject, error: subjectError } = await supabase
        .from("subjects")
        .insert({
          nombre: data.nombre,
          codigo: data.codigo,
          año: data.año,
          numero_materia: nextNumero,
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // Create dependencies for regular requirements
      if (data.requiere_regular && data.requiere_regular.length > 0) {
        const regularDeps = data.requiere_regular.map(reqId => ({
          subject_id: newSubject.id,
          requiere_regular: reqId,
        }));

        const { error: regError } = await supabase
          .from("subject_dependencies")
          .insert(regularDeps);

        if (regError) throw regError;
      }

      // Create dependencies for approved requirements
      if (data.requiere_aprobada && data.requiere_aprobada.length > 0) {
        const approvedDeps = data.requiere_aprobada.map(reqId => ({
          subject_id: newSubject.id,
          requiere_aprobada: reqId,
        }));

        const { error: aprError } = await supabase
          .from("subject_dependencies")
          .insert(approvedDeps);

        if (aprError) throw aprError;
      }

      await fetchData(false);
      toast.success("Materia creada correctamente");
      return newSubject;
    } catch (error) {
      console.error("Error creating subject:", error);
      toast.error("Error al crear la materia");
      throw error;
    }
  };

  const updateSubjectDependencies = async (
    subjectId: string,
    requiere_regular: string[],
    requiere_aprobada: string[]
  ) => {
    try {
      // Delete existing dependencies
      const { error: deleteError } = await supabase
        .from("subject_dependencies")
        .delete()
        .eq("subject_id", subjectId);

      if (deleteError) throw deleteError;

      // Create new dependencies
      const newDeps: { subject_id: string; requiere_regular?: string; requiere_aprobada?: string }[] = [];

      requiere_regular.forEach(reqId => {
        newDeps.push({ subject_id: subjectId, requiere_regular: reqId });
      });

      requiere_aprobada.forEach(reqId => {
        newDeps.push({ subject_id: subjectId, requiere_aprobada: reqId });
      });

      if (newDeps.length > 0) {
        const { error: insertError } = await supabase
          .from("subject_dependencies")
          .insert(newDeps);

        if (insertError) throw insertError;
      }

      await fetchData(false);
      toast.success("Correlativas actualizadas correctamente");
    } catch (error) {
      console.error("Error updating dependencies:", error);
      toast.error("Error al actualizar las correlativas");
      throw error;
    }
  };

  const deleteSubject = async (subjectId: string) => {
    try {
      // Delete dependencies first
      await supabase
        .from("subject_dependencies")
        .delete()
        .eq("subject_id", subjectId);

      // Delete user statuses
      await supabase
        .from("user_subject_status")
        .delete()
        .eq("subject_id", subjectId);

      // Delete the subject
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);

      if (error) throw error;

      await fetchData(false);
      toast.success("Materia eliminada correctamente");
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Error al eliminar la materia");
      throw error;
    }
  };

  const updatePartialGrades = async (subjectId: string, grades: PartialGrades) => {
    if (!user) return;

    try {
      const existingStatus = userStatuses.find(s => s.subject_id === subjectId);

      if (existingStatus) {
        const { error } = await supabase
          .from("user_subject_status")
          .update({
            nota_parcial_1: grades.nota_parcial_1,
            nota_rec_parcial_1: grades.nota_rec_parcial_1,
            nota_parcial_2: grades.nota_parcial_2,
            nota_rec_parcial_2: grades.nota_rec_parcial_2,
            nota_global: grades.nota_global,
            nota_rec_global: grades.nota_rec_global,
            nota_final_examen: grades.nota_final_examen,
          })
          .eq("id", existingStatus.id);

        if (error) throw error;
      } else {
        // Create a new status record with partial grades
        const { error } = await supabase
          .from("user_subject_status")
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            estado: "cursable",
            nota_parcial_1: grades.nota_parcial_1,
            nota_rec_parcial_1: grades.nota_rec_parcial_1,
            nota_parcial_2: grades.nota_parcial_2,
            nota_rec_parcial_2: grades.nota_rec_parcial_2,
            nota_global: grades.nota_global,
            nota_rec_global: grades.nota_rec_global,
            nota_final_examen: grades.nota_final_examen,
          });

        if (error) throw error;
      }

      await fetchData(false);
      // No toast on success to avoid spamming during auto-save
    } catch (error) {
      console.error("Error updating partial grades:", error);
      toast.error("Error al actualizar las notas parciales");
      throw error;
    }
  };

  const getYears = useCallback((): number[] => {
    const years = [...new Set(subjects.map(s => s.año))].sort((a, b) => a - b);
    return years.length > 0 ? years : [1, 2, 3, 4, 5];
  }, [subjects]);

  // Initialize user statuses for 1st and 2nd year (all approved except Inglés II)
  const initializeDefaultStatuses = async () => {
    if (!user) return;

    try {
      // Get subjects from 1st and 2nd year
      const subjectsToApprove = subjects.filter(s =>
        (s.año === 1 || s.año === 2) && s.codigo !== "ING2"
      );

      // Check which ones don't have a status yet
      const statusesToCreate = subjectsToApprove.filter(s =>
        !userStatuses.some(us => us.subject_id === s.id)
      );

      if (statusesToCreate.length === 0) {
        toast.info("Los estados ya están inicializados");
        return;
      }

      // Create statuses for all subjects
      const newStatuses = statusesToCreate.map(s => ({
        user_id: user.id,
        subject_id: s.id,
        estado: "aprobada" as const,
        nota: 7, // Default grade
        fecha_aprobacion: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from("user_subject_status")
        .insert(newStatuses);

      if (error) throw error;

      await fetchData(false);
      toast.success(`Se inicializaron ${statusesToCreate.length} materias como aprobadas`);
    } catch (error) {
      console.error("Error initializing statuses:", error);
      toast.error("Error al inicializar los estados");
    }
  };

  return {
    subjects: subjectsWithStatus,
    rawSubjects: subjects,
    dependencies,
    loading,
    updateSubjectStatus,
    updatePartialGrades,
    createSubject,
    updateSubjectDependencies,
    deleteSubject,
    initializeDefaultStatuses,
    refetch: fetchData,
    getYears,
  };
}

