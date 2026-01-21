import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export interface SubjectWithStatus extends Subject {
  status: SubjectStatus;
  nota: number | null;
  fecha_aprobacion: string | null;
  requisitos_faltantes: string[];
}

interface Dependency {
  subject_id: string;
  requiere_regular: string | null;
  requiere_aprobada: string | null;
}

export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserSubjectStatus[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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
  };

  const getSubjectStatus = (subjectId: string): SubjectStatus => {
    const userStatus = userStatuses.find(s => s.subject_id === subjectId);
    if (userStatus) {
      return userStatus.estado as SubjectStatus;
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
  };

  const getMissingRequirements = (subjectId: string): string[] => {
    const deps = dependencies.filter(d => d.subject_id === subjectId);
    const missing: string[] = [];

    deps.forEach(dep => {
      if (dep.requiere_aprobada) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_aprobada);
        if (reqStatus?.estado !== "aprobada") {
          const subject = subjects.find(s => s.id === dep.requiere_aprobada);
          if (subject) missing.push(`${subject.codigo} aprobada`);
        }
      }
      if (dep.requiere_regular) {
        const reqStatus = userStatuses.find(s => s.subject_id === dep.requiere_regular);
        if (reqStatus?.estado !== "aprobada" && reqStatus?.estado !== "regular") {
          const subject = subjects.find(s => s.id === dep.requiere_regular);
          if (subject) missing.push(`${subject.codigo} regular`);
        }
      }
    });

    return missing;
  };

  const getSubjectsWithStatus = (): SubjectWithStatus[] => {
    return subjects.map(subject => {
      const userStatus = userStatuses.find(s => s.subject_id === subject.id);
      const status = getSubjectStatus(subject.id);
      
      return {
        ...subject,
        status,
        nota: userStatus?.nota ?? null,
        fecha_aprobacion: userStatus?.fecha_aprobacion ?? null,
        requisitos_faltantes: status === "bloqueada" ? getMissingRequirements(subject.id) : [],
      };
    });
  };

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

  return {
    subjects: getSubjectsWithStatus(),
    loading,
    updateSubjectStatus,
    refetch: fetchData,
  };
}
