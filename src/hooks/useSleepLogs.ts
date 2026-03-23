import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toLocalDateStr } from "@/lib/utils";

export interface SleepLog {
  id: string;
  user_id: string;
  fecha: string;
  horas: number;
  calidad: 'buena' | 'regular' | 'mala';
  created_at: string;
}

export function useSleepLogs() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getSleepLogs = useCallback(async (from: Date, to: Date) => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("sleep_logs" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("fecha", toLocalDateStr(from))
        .lte("fecha", toLocalDateStr(to))
        .order("fecha", { ascending: true });

      if (error) throw error;
      return data as SleepLog[];
    } catch (error) {
      console.error("Error fetching sleep logs:", error);
      toast.error("Error al cargar registros de sueño");
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addSleepLog = useCallback(async (log: Omit<SleepLog, "id" | "user_id" | "created_at">) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("sleep_logs" as any) as any)
        .upsert([{ ...log, user_id: user.id }], { onConflict: 'user_id,fecha' })
        .select()
        .single();

      if (error) throw error;
      toast.success("Registro de sueño guardado");
      return data as SleepLog;
    } catch (error) {
      console.error("Error adding sleep log:", error);
      toast.error("Error al guardar registro de sueño");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSleepLog = useCallback(async (id: string, log: Omit<SleepLog, "id" | "user_id" | "created_at">) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("sleep_logs" as any) as any)
        .update({ ...log })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Registro de sueño actualizado");
      return data as SleepLog;
    } catch (error) {
      console.error("Error updating sleep log:", error);
      toast.error("Error al actualizar registro de sueño");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteSleepLog = useCallback(async (id: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await (supabase
        .from("sleep_logs" as any) as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Registro eliminado");
      return true;
    } catch (error) {
      console.error("Error deleting sleep log:", error);
      toast.error("Error al eliminar registro");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    getSleepLogs,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog
  };
}
