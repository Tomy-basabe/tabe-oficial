import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toLocalDateStr } from "@/lib/utils";
import { broadcastNotionDocUpdate, broadcastNotionDocDeleted, subscribeNotionSync } from "@/lib/notionSync";
import { isDocumentInTrash, moveToTrash, restoreFromTrash, purgeExpiredTrash, permanentlyDelete } from "@/lib/notionTrash";

export interface NotionDocument {
  id: string;
  user_id: string;
  subject_id: string | null;
  parent_id: string | null;
  titulo: string;
  contenido?: any;
  emoji: string;
  cover_url: string | null;
  is_favorite: boolean;
  total_time_seconds: number;
  created_at: string;
  updated_at: string;
  subject?: {
    id?: string;
    nombre: string;
    codigo: string;
    year: number;
    año?: number;
  };
  owner?: {
    nombre: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  is_shared?: boolean;
  share_token?: string | null;
  share_permission?: 'view' | 'edit';
  user_permission?: 'view' | 'edit' | 'owner';
  is_collaborator?: boolean;
}

export function useNotionDocuments() {
  const { user, isGuest } = useAuth();
  const [documents, setDocuments] = useState<NotionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  // Cache subjects map to avoid refetching on every refetch()
  const subjectsMapRef = useRef<Record<string, { nombre: string; codigo: string; year: number }>>({});
  const cachedSubjectIdsRef = useRef<Set<string>>(new Set());
  // Persistent content cache - survives refetches
  const contentCacheRef = useRef<Map<string, any>>(new Map());

  // Escuchar sincronización de otras pestañas en tiempo real (0ms, 0 requests)
  useEffect(() => {
    const unsubscribe = subscribeNotionSync((msg) => {
      if (msg.type === "DOC_UPDATED") {
        if (msg.content) {
          contentCacheRef.current.set(msg.docId, msg.content);
          try {
            sessionStorage.setItem(`tabe_doc_content_${msg.docId}`, JSON.stringify(msg.content));
          } catch (e) {}
        }
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === msg.docId
              ? {
                  ...d,
                  titulo: msg.title !== undefined ? msg.title : d.titulo,
                  emoji: msg.emoji !== undefined ? msg.emoji : d.emoji,
                  updated_at: msg.updatedAt || new Date().toISOString(),
                }
              : d
          )
        );
      } else if (msg.type === "DOC_DELETED") {
        contentCacheRef.current.delete(msg.docId);
        try {
          sessionStorage.removeItem(`tabe_doc_content_${msg.docId}`);
        } catch (e) {}
        setDocuments((prev) => prev.filter((d) => d.id !== msg.docId && d.parent_id !== msg.docId));
      }
    });

    return unsubscribe;
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isGuest) {
      setDocuments([
        {
          id: "mock-doc-1",
          user_id: "guest",
          subject_id: "mock",
          titulo: "Acerca de los Apuntes",
          contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "En los apuntes de Tabe puedes redactar tus ideas libres, resúmenes de clase y apuntes detallados. El editor soporta formato rico, atajos de teclado y autoguardado." }] }] },
          emoji: "📝",
          cover_url: null,
          is_favorite: true,
          parent_id: null,
          total_time_seconds: 4500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subject: { nombre: "Uso de Tablero", codigo: "TAB1", year: 1 }
        },
        {
          id: "mock-doc-2",
          user_id: "guest",
          subject_id: "mock",
          titulo: "La Inteligencia Artificial",
          contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "La IA de Tabe puede leer los apuntes que guardes aquí. Luego, podes pedirle desde el chat que te genere Cuestionarios o Flashcards basándose EXPRESAMENTE en lo que hayas escrito." }] }] },
          emoji: "🤖",
          cover_url: null,
          is_favorite: false,
          parent_id: null,
          total_time_seconds: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subject: { nombre: "Técnicas de Estudio", codigo: "EST1", year: 1 }
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      // Timeout de seguridad de 6 segundos para evitar pantallas de carga infinitas
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: "FETCH_DOCUMENTS_TIMEOUT" } }), 6000);
      });

      // @AI-CRITICAL-INSTRUCTION: MANTENER EFICIENCIA DE EGRESS.
      // A CUALQUIER IA FUTURA QUE LEA ESTE CÓDIGO: NUNCA modifiques este .select() para incluir la columna "contenido" o usar "*".
      // Descargar el contenido JSON de todos los documentos en esta lista agota los 5GB de límite de Egress de Supabase.
      // El contenido SOLO debe descargarse individualmente en fetchDocumentContent. NO ROMPAS ESTA REGLA.
      const fetchPromise = supabase
        .from("notion_documents")
        .select(`
          id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
          is_shared, share_token, share_permission,
          owner:profiles(nombre, avatar_url, username),
          subject:subjects(id, nombre, codigo, año)
        `)
        .order("updated_at", { ascending: false })
        .limit(100);

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = res as any;

      if (error && error.message !== "FETCH_DOCUMENTS_TIMEOUT") {
        console.error("Error fetching documents:", error.message);
      } else if (data) {
        // Cache subjects from join
        data.forEach((d: any) => {
          if (d.subject && d.subject_id) {
            subjectsMapRef.current[d.subject_id] = {
              id: d.subject.id,
              nombre: d.subject.nombre,
              codigo: d.subject.codigo,
              year: d.subject.año,
              año: d.subject.año,
            };
            cachedSubjectIdsRef.current.add(d.subject_id);
          }
        });

        // Purgar de la base de datos elementos de papelera cuya gracia de 30 min expiró
        purgeExpiredTrash(supabase);

        const mapped = data
          .filter((d: any) => !isDocumentInTrash(d.id))
          .map((d: any) => {
          const sub = d.subject
            ? {
                id: d.subject.id,
                nombre: d.subject.nombre,
                codigo: d.subject.codigo,
                year: d.subject.año,
                año: d.subject.año,
              }
            : (d.subject_id ? subjectsMap[d.subject_id] : undefined);

          return {
            ...d,
            subject: sub,
            contenido: contentCacheRef.current.get(d.id) || undefined,
          };
        }) as NotionDocument[];

        setDocuments(mapped);
      }
    } catch (err) {
      console.warn("Exception during fetchDocuments:", err);
    } finally {
      // Garantizar SIEMPRE que loading pase a false para nunca dejar la pantalla trabada
      setLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (user || isGuest) {
      fetchDocuments();
    }
  }, [user, isGuest, fetchDocuments]);

  const createDocument = async (
    subjectId: string,
    titulo: string = "Sin título",
    parentId: string | null = null,
    initialContent?: any,
    emoji?: string
  ) => {
    if (!user) return null;

    const docContent = initialContent ? JSON.parse(JSON.stringify(initialContent)) : { type: "doc", content: [{ type: "paragraph" }] };
    const docEmoji = emoji || "📝";

    const { data, error } = await supabase
      .from("notion_documents")
      .insert({
        user_id: user.id,
        subject_id: subjectId || null,
        parent_id: parentId,
        titulo,
        contenido: docContent,
        emoji: docEmoji,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error);
      toast.error("Error al crear documento");
      return null;
    }

    // Use cached subject info if available to avoid an extra DB roundtrip
    let subjectInfo = subjectId ? subjectsMapRef.current[subjectId] : undefined;
    if (!subjectInfo && subjectId) {
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("nombre, codigo, año")
        .eq("id", subjectId)
        .maybeSingle();

      if (subjectData) {
        subjectInfo = {
          nombre: (subjectData as any).nombre,
          codigo: (subjectData as any).codigo,
          year: (subjectData as any).año
        };
        subjectsMapRef.current[subjectId] = subjectInfo;
      }
    }

    const newDoc: NotionDocument = {
      ...data,
      contenido: docContent,
      subject: subjectInfo
    };

    // Cache initial content immediately so opening it is instantaneous
    contentCacheRef.current.set(newDoc.id, docContent);
    try {
      sessionStorage.setItem(`tabe_doc_content_${newDoc.id}`, JSON.stringify(docContent));
    } catch (e) {}

    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocument = async (
    id: string,
    updates: Partial<Pick<NotionDocument, "titulo" | "contenido" | "emoji" | "cover_url" | "is_favorite" | "total_time_seconds" | "is_shared" | "share_token" | "share_permission">>
  ) => {
    // Si es modo invitado o documento de prueba / mock, guardar únicamente en memoria y sesión sin error
    if (isGuest || id.startsWith("mock-") || !id) {
      if (updates.contenido) {
        contentCacheRef.current.set(id, updates.contenido);
        try {
          sessionStorage.setItem(`tabe_doc_content_${id}`, JSON.stringify(updates.contenido));
        } catch (e) {}
      }
      const { contenido, ...metaUpdates } = updates;
      setDocuments(prev =>
        prev.map(doc => doc.id === id ? { ...doc, ...metaUpdates, updated_at: new Date().toISOString() } : doc)
      );
      return true;
    }

    const { error } = await supabase
      .from("notion_documents")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating document in Supabase:", error, id);
      return false;
    }

    // Keep content cache in sync for when document is opened
    if (updates.contenido) {
      contentCacheRef.current.set(id, updates.contenido);
      try {
        sessionStorage.setItem(`tabe_doc_content_${id}`, JSON.stringify(updates.contenido));
      } catch (e) {}
    }

    // Do NOT put heavy 'contenido' into the global documents list state!
    // The documents list only needs metadata (titulo, emoji, cover, etc.)
    const { contenido, ...metaUpdates } = updates;
    const nowIso = new Date().toISOString();
    setDocuments(prev =>
      prev.map(doc => doc.id === id ? { ...doc, ...metaUpdates, updated_at: nowIso } : doc)
    );

    // Notificar a las demás pestañas instantáneamente (0ms, 0 requests a Supabase)
    broadcastNotionDocUpdate({
      docId: id,
      content: updates.contenido,
      title: updates.titulo,
      emoji: updates.emoji,
      updatedAt: nowIso,
    });

    return true;
  };

  // @AI-CRITICAL-INSTRUCTION: PROTECCIÓN DE LÍMITES DE ALMACENAMIENTO (STORAGE).
  // Si en el futuro modificas cómo se borran los documentos, OBLIGATORIAMENTE debes buscar
  // y eliminar todos los archivos asociados en Supabase Storage (imágenes, audios).
  // Si dejas archivos huérfanos, el bucket de Storage crecerá infinitamente sumando costos.
  const deleteDocument = async (id: string, permanent: boolean = false) => {
    const docToDelete = documents.find(d => d.id === id);

    if (permanent) {
      if (docToDelete?.cover_url && docToDelete.cover_url.includes('notion-images')) {
        const fileName = docToDelete.cover_url.split('/').pop()?.split('?')[0];
        if (fileName) {
          supabase.storage.from('notion-images').remove([fileName]).catch(console.error);
        }
      }

      await permanentlyDelete(id, supabase);
    } else {
      // Período de gracia de 30 min: se almacena en papelera y se mantiene en BD hasta que expiren los 30 min
      if (docToDelete) {
        moveToTrash(docToDelete);
      } else {
        moveToTrash({ id });
      }
    }

    contentCacheRef.current.delete(id);
    try {
      sessionStorage.removeItem(`tabe_doc_content_${id}`);
    } catch (e) {}
    setDocuments(prev => prev.filter(doc => doc.id !== id && doc.parent_id !== id));
    
    // Notificar a las demás pestañas para que cierren el documento si lo tenían abierto
    broadcastNotionDocDeleted(id);

    if (permanent) {
      toast.success("Documento eliminado definitivamente");
    } else {
      toast.info("Apunte en la papelera (tienes 30 min para recuperarlo)");
    }
    return true;
  };

  const restoreDocument = async (id: string) => {
    restoreFromTrash(id);
    await fetchDocuments();
    toast.success("Apunte restaurado con éxito");
  };

  // Save study time and update document - ALWAYS save to metrics for plant growth
  const addStudyTime = async (documentId: string, seconds: number, subjectId: string | null) => {
    if (!user || seconds < 1) return;

    // Update document total time - ONLY if I am the owner
    const doc = documents.find(d => d.id === documentId);
    const isOwner = doc && doc.user_id === user.id;

    if (doc && isOwner) {
      await updateDocument(documentId, {
        total_time_seconds: doc.total_time_seconds + seconds
      });
    }

    // Save to study_sessions for metrics and plant growth
    try {
      const { error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: subjectId || null,
          duracion_segundos: seconds,
          tipo: "apuntes",
          completada: true,
          fecha: toLocalDateStr(),
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving notion study session:", error);
    }
  };

  const fetchDocumentContent = async (docId: string, forceFresh: boolean = false): Promise<any> => {
    if (!forceFresh) {
      // 1. Return from memory cache if available (0ms)
      const cached = contentCacheRef.current.get(docId);
      if (cached) {
        return cached;
      }

      // 2. Return from sessionStorage cache if available (0ms)
      try {
        const stored = sessionStorage.getItem(`tabe_doc_content_${docId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          contentCacheRef.current.set(docId, parsed);
          return parsed;
        }
      } catch (e) {}
    }

    try {
      // Timeout de seguridad de 5 segundos para que la apertura de un apunte nunca se quede colgada
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: "FETCH_CONTENT_TIMEOUT" } }), 5000);
      });

      const fetchPromise = supabase
        .from("notion_documents")
        .select("contenido")
        .eq("id", docId)
        .single();

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = res as any;

      if (error) {
        if (error.message === "FETCH_CONTENT_TIMEOUT") {
          console.warn("fetchDocumentContent timed out, checking fallback cache");
          const fallback = contentCacheRef.current.get(docId);
          if (fallback) return fallback;
        }
        throw error;
      }
      
      // Store in memory and persistent session cache
      if (data && data.contenido) {
        contentCacheRef.current.set(docId, data.contenido);
        try {
          sessionStorage.setItem(`tabe_doc_content_${docId}`, JSON.stringify(data.contenido));
        } catch (e) {}
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, contenido: data?.contenido } : doc
      ));

      return data?.contenido || null;
    } catch (error: any) {
      console.error("Error fetching document content:", error);
      // Fallback a caché si la red falló
      const fallback = contentCacheRef.current.get(docId);
      if (fallback) return fallback;
      toast.error("Error al cargar el contenido del documento");
      return null;
    }
  };

  // Prefetch content on hover (Disabled to prevent heavy egress bills from Supabase)
  const prefetchDocumentContent = (_docId: string) => {
    // Content is loaded lazily on explicit document click/open
    return;
  };

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    restoreDocument,
    permanentlyDeleteDocument: (id: string) => deleteDocument(id, true),
    addStudyTime,
    fetchDocumentContent,
    prefetchDocumentContent,
    refetch: fetchDocuments,
  };
}
