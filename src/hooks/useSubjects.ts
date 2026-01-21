import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
export type SubjectStatus = "aprobada" | "regular" | "cursable" | "bloqueada" | "recursar";

export interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
  numero_materia: number;
}

export interface UserSubjectStatus {
  id: string;
  subject_id: string;
  estado: SubjectStatus;
  nota: number | null;
  fecha_aprobacion: string | null;
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("año", { ascending: true })
        .order("numero_materia", { ascending: true });

      if (subjectsError) throw subjectsError;

      // Fetch user statuses
      const { data: statusData, error: statusError } = await supabase
        .from("user_subject_status")
        .select("*");

      if (statusError) throw statusError;

      // Fetch dependencies
      const { data: depsData, error: depsError } = await supabase
        .from("subject_dependencies")
        .select("*");

      if (depsError) throw depsError;

      setSubjects(subjectsData || []);
      setUserStatuses((statusData || []).map(s => ({
        ...s,
        estado: s.estado as SubjectStatus,
      })));
      setDependencies(depsData || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Error al cargar las materias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Realtime subscription for user_subject_status changes
  useRealtimeSubscription({
    table: "user_subject_status",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      console.log("📡 Realtime: user_subject_status changed, refetching...");
      fetchData();
    }, [fetchData]),
    enabled: !!user,
  });

  const getSubjectStatus = useCallback((subjectId: string): SubjectStatus => {
    const userStatus = userStatuses.find(s => s.subject_id === subjectId);
    if (userStatus) {
      return userStatus.estado;
    }
    
    // Check if subject is unlocked based on dependencies
    const deps = dependencies.filter(d => d.subject_id === subjectId);
    if (deps.length === 0) {
      return "cursable"; // No dependencies = can be taken
    }

    // Check all dependencies
    const canTake = deps.every(dep => {
      if (dep.requiere_aprobada) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_aprobada);
        return reqStatus?.estado === "aprobada";
      }
      if (dep.requiere_regular) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_regular);
        return reqStatus?.estado === "aprobada" || reqStatus?.estado === "regular";
      }
      return true;
    });

    return canTake ? "cursable" : "bloqueada";
  }, [userStatuses, dependencies]);

  const getMissingRequirements = useCallback((subjectId: string): string[] => {
    const deps = dependencies.filter(d => d.subject_id === subjectId);
    const missing: string[] = [];

    deps.forEach(dep => {
      if (dep.requiere_aprobada) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_aprobada);
        if (reqStatus?.estado !== "aprobada") {
          const subject = subjects.find(s => s.id === dep.requiere_aprobada);
          if (subject) missing.push(`${subject.numero_materia} aprobada`);
        }
      }
      if (dep.requiere_regular) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_regular);
        if (reqStatus?.estado !== "aprobada" && reqStatus?.estado !== "regular") {
          const subject = subjects.find(s => s.id === dep.requiere_regular);
          if (subject) missing.push(`${subject.numero_materia} regular`);
        }
      }
    });

    return missing;
  }, [dependencies, userStatuses, subjects]);

  const getSubjectsWithStatus = useCallback((): SubjectWithStatus[] => {
    return subjects.map(subject => {
      const userStatus = userStatuses.find(s => s.subject_id === subject.id);
      const status = getSubjectStatus(subject.id);
      const subjectDeps = dependencies.filter(d => d.subject_id === subject.id);
      
      return {
        ...subject,
        status,
        nota: userStatus?.nota ?? null,
        fecha_aprobacion: userStatus?.fecha_aprobacion ?? null,
        requisitos_faltantes: status === "bloqueada" ? getMissingRequirements(subject.id) : [],
        dependencies: subjectDeps,
      };
    });
  }, [subjects, userStatuses, dependencies, getSubjectStatus, getMissingRequirements]);

  const updateSubjectStatus = async (
    subjectId: string, 
    estado: SubjectStatus, 
    nota?: number
  ) => {
    if (!user) return;

    try {
      const existingStatus = userStatuses.find(s => s.subject_id === subjectId);
      
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

      await fetchData();
      toast.success("Estado actualizado correctamente");
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

      await fetchData();
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

      await fetchData();
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

      await fetchData();
      toast.success("Materia eliminada correctamente");
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Error al eliminar la materia");
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

      await fetchData();
      toast.success(`Se inicializaron ${statusesToCreate.length} materias como aprobadas`);
    } catch (error) {
      console.error("Error initializing statuses:", error);
      toast.error("Error al inicializar los estados");
    }
  };

  return {
    subjects: getSubjectsWithStatus(),
    rawSubjects: subjects,
    dependencies,
    loading,
    updateSubjectStatus,
    createSubject,
    updateSubjectDependencies,
    deleteSubject,
    initializeDefaultStatuses,
    refetch: fetchData,
    getYears,
  };
}
