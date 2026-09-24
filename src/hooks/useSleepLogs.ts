import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toLocalDateStr } from "@/lib/utils";
import { subDays } from "date-fns";

export interface SleepLog {
  id: string;
  user_id: string;
  fecha: string;
  horas: number;
  calidad: 'buena' | 'regular' | 'mala';
  created_at: string;
}

const GUEST_SLEEP_KEY = "tabe_guest_sleep_logs";

function getGuestSleepLogs(): SleepLog[] {
  try {
    const raw = localStorage.getItem(GUEST_SLEEP_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading guest sleep logs:", e);
  }

  // Initial demo logs for guests
  const today = new Date();
  const demoLogs: SleepLog[] = [
    { id: "guest-s1", user_id: "guest", fecha: toLocalDateStr(subDays(today, 1)), horas: 7.5, calidad: "buena", created_at: new Date().toISOString() },
    { id: "guest-s2", user_id: "guest", fecha: toLocalDateStr(subDays(today, 2)), horas: 6.5, calidad: "regular", created_at: new Date().toISOString() },
    { id: "guest-s3", user_id: "guest", fecha: toLocalDateStr(subDays(today, 3)), horas: 8.0, calidad: "buena", created_at: new Date().toISOString() },
    { id: "guest-s4", user_id: "guest", fecha: toLocalDateStr(subDays(today, 4)), horas: 5.5, calidad: "mala", created_at: new Date().toISOString() },
  ];
  try {
    localStorage.setItem(GUEST_SLEEP_KEY, JSON.stringify(demoLogs));
  } catch (e) {}
  return demoLogs;
}

function saveGuestSleepLogs(logs: SleepLog[]) {
  try {
    localStorage.setItem(GUEST_SLEEP_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Error saving guest sleep logs:", e);
  }
}

export function useSleepLogs() {
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);

  const getSleepLogs = useCallback(async (from: Date, to: Date): Promise<SleepLog[]> => {
    // 1. Guest mode
    if (isGuest || !user) {
      const fromStr = toLocalDateStr(from);
      const toStr = toLocalDateStr(to);
      const all = getGuestSleepLogs();
      return all
        .filter(l => l.fecha >= fromStr && l.fecha <= toStr)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    setLoading(true);
    try {
      const fromStr = toLocalDateStr(from);
      const toStr = toLocalDateStr(to);

      const { data, error } = await (supabase
        .from("sleep_logs" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("fecha", fromStr)
        .lte("fecha", toStr)
        .order("fecha", { ascending: true });

      if (error) {
        console.warn("Error fetching sleep logs from supabase:", error);
        return [];
      }
      return (data || []) as SleepLog[];
    } catch (error) {
      console.error("Error fetching sleep logs:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  const addSleepLog = useCallback(async (log: Omit<SleepLog, "id" | "user_id" | "created_at">): Promise<SleepLog | null> => {
    // 1. Guest mode
    if (isGuest || !user) {
      const all = getGuestSleepLogs();
      const existingIdx = all.findIndex(l => l.fecha === log.fecha);
      let created: SleepLog;

      if (existingIdx >= 0) {
        created = {
          ...all[existingIdx],
          horas: log.horas,
          calidad: log.calidad,
        };
        all[existingIdx] = created;
      } else {
        created = {
          id: `guest-${Date.now()}`,
          user_id: "guest",
          fecha: log.fecha,
          horas: log.horas,
          calidad: log.calidad,
          created_at: new Date().toISOString(),
        };
        all.push(created);
      }

      saveGuestSleepLogs(all);
      toast.success("Registro de sueño guardado");
      return created;
    }

    setLoading(true);
    try {
      // Robust check: first check if a record for this date exists
      const { data: existingRows } = await (supabase
        .from("sleep_logs" as any) as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("fecha", log.fecha);

      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      let result: SleepLog;

      if (existing?.id) {
        // Update existing record
        const { data, error } = await (supabase
          .from("sleep_logs" as any) as any)
          .update({
            horas: log.horas,
            calidad: log.calidad,
          })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select();

        if (error) throw error;
        result = (data && data[0]) ? data[0] : { id: existing.id, user_id: user.id, ...log, created_at: new Date().toISOString() };
      } else {
        // Insert new record
        const { data, error } = await (supabase
          .from("sleep_logs" as any) as any)
          .insert([{
            user_id: user.id,
            fecha: log.fecha,
            horas: log.horas,
            calidad: log.calidad,
          }])
          .select();

        if (error) {
          // If conflict/duplicate constraint occurs, fallback to update by fecha
          if (error.code === "23505") {
            const { data: updateData, error: updateErr } = await (supabase
              .from("sleep_logs" as any) as any)
              .update({ horas: log.horas, calidad: log.calidad })
              .eq("user_id", user.id)
              .eq("fecha", log.fecha)
              .select();
            if (updateErr) throw updateErr;
            result = (updateData && updateData[0]) ? updateData[0] : { id: `sleep-${Date.now()}`, user_id: user.id, ...log, created_at: new Date().toISOString() };
          } else {
            throw error;
          }
        } else {
          result = (data && data[0]) ? data[0] : { id: `sleep-${Date.now()}`, user_id: user.id, ...log, created_at: new Date().toISOString() };
        }
      }

      toast.success("Registro de sueño guardado");
      return result;
    } catch (error: any) {
      console.error("Error adding sleep log:", error);
      toast.error(error?.message ? `Error: ${error.message}` : "Error al guardar registro de sueño");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  const updateSleepLog = useCallback(async (id: string, log: Omit<SleepLog, "id" | "user_id" | "created_at">): Promise<SleepLog | null> => {
    // 1. Guest mode
    if (isGuest || !user) {
      const all = getGuestSleepLogs();
      const idx = all.findIndex(l => l.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...log };
        saveGuestSleepLogs(all);
        toast.success("Registro de sueño actualizado");
        return all[idx];
      }
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("sleep_logs" as any) as any)
        .update({ ...log })
        .eq("id", id)
        .eq("user_id", user.id)
        .select();

      if (error) throw error;
      toast.success("Registro de sueño actualizado");
      return (data && data[0]) as SleepLog;
    } catch (error: any) {
      console.error("Error updating sleep log:", error);
      toast.error(error?.message ? `Error: ${error.message}` : "Error al actualizar registro de sueño");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  const deleteSleepLog = useCallback(async (id: string): Promise<boolean> => {
    // 1. Guest mode
    if (isGuest || !user) {
      const all = getGuestSleepLogs();
      const filtered = all.filter(l => l.id !== id);
      saveGuestSleepLogs(filtered);
      toast.success("Registro eliminado");
      return true;
    }

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
    } catch (error: any) {
      console.error("Error deleting sleep log:", error);
      toast.error("Error al eliminar registro");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  return {
    loading,
    getSleepLogs,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog
  };
}
