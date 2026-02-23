import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotionDocument {
  id: string;
  user_id: string;
  subject_id: string | null;
  titulo: string;
  contenido: any;
  emoji: string;
  cover_url: string | null;
  is_favorite: boolean;
  total_time_seconds: number;
  created_at: string;
  updated_at: string;
  subject?: {
    nombre: string;
    codigo: string;
    year: number;
  };
}

export function useNotionDocuments() {
  const { user, isGuest } = useAuth();
  const [documents, setDocuments] = useState<NotionDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user && !isGuest) return;

    setLoading(true);

    if (isGuest) {
      setDocuments([
        {
          id: "mock-doc-1",
          user_id: "guest",
          subject_id: "mock",
          titulo: "Apuntes de Anatomía: Huesos",
          contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "El fémur es el hueso más largo del cuerpo humano." }] }] },
          emoji: "🦴",
          cover_url: null,
          is_favorite: true,
          total_time_seconds: 4500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subject: { nombre: "Anatomía", codigo: "AN1", year: 1 }
        },
        {
          id: "mock-doc-2",
          user_id: "guest",
          subject_id: "mock",
          titulo: "Fórmulas de Cálculo",
          contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "La derivada de e^x es e^x.\nLa integral de 1/x es ln|x|." }] }] },
          emoji: "📐",
          cover_url: null,
          is_favorite: false,
          total_time_seconds: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subject: { nombre: "Cálculo", codigo: "CA1", year: 1 }
        }
      ]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notion_documents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      toast.error("Error al cargar documentos");
    } else if (data) {
      // Fetch subjects for each document
      const subjectIds = [...new Set(data.filter(d => d.subject_id).map(d => d.subject_id))] as string[];
      let subjectsMap: Record<string, { nombre: string; codigo: string; year: number }> = {};

      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("id, nombre, codigo, año")
          .in("id", subjectIds);

        if (subjectsData) {
          subjectsMap = (subjectsData as any[]).reduce((acc, s) => {
            acc[s.id] = { nombre: s.nombre, codigo: s.codigo, year: s.año };
            return acc;
          }, {} as Record<string, { nombre: string; codigo: string; year: number }>);
        }
      }

      const mapped = data.map((d) => ({
        ...d,
        subject: d.subject_id ? subjectsMap[d.subject_id] : undefined,
      })) as NotionDocument[];

      setDocuments(mapped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user || isGuest) {
      fetchDocuments();
    }
  }, [user, isGuest, fetchDocuments]);

  const createDocument = async (subjectId: string, titulo: string = "Sin título") => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("notion_documents")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        titulo,
        contenido: { type: "doc", content: [{ type: "paragraph" }] },
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error);
      toast.error("Error al crear documento");
      return null;
    }

    // Fetch the subject info separately
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("nombre, codigo, año")
      .eq("id", subjectId)
      .single();

    const subjectInfo = subjectData ? {
      nombre: (subjectData as any).nombre,
      codigo: (subjectData as any).codigo,
      year: (subjectData as any).año
    } : undefined;

    const newDoc = {
      ...data,
      subject: subjectInfo
    } as NotionDocument;

    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocument = async (
    id: string,
    updates: Partial<Pick<NotionDocument, "titulo" | "contenido" | "emoji" | "cover_url" | "is_favorite" | "total_time_seconds">>
  ) => {
    const { error } = await supabase
      .from("notion_documents")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating document:", error);
      return false;
    }

    setDocuments(prev =>
      prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
    );
    return true;
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase
      .from("notion_documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting document:", error);
      toast.error("Error al eliminar documento");
      return false;
    }

    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast.success("Documento eliminado");
    return true;
  };

  // Save study time and update document - ALWAYS save to metrics for plant growth
  const addStudyTime = async (documentId: string, seconds: number, subjectId: string | null) => {
    if (!user || seconds < 1) return;

    // Update document total time
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      await updateDocument(documentId, {
        total_time_seconds: doc.total_time_seconds + seconds
      });
    }

    // Save to study_sessions for metrics and plant growth
    // Save all sessions (even short ones) so the plant can track activity
    try {
      await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          duracion_segundos: seconds,
          tipo: "estudio",
          completada: true,
          fecha: new Date().toISOString().split('T')[0],
        });
    } catch (error) {
      console.error("Error saving notion study session:", error);
    }
  };

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    addStudyTime,
    refetch: fetchDocuments,
  };
}
