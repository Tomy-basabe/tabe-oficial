import { supabase } from "@/integrations/supabase/client";
import { TabeGochiPet } from "@/types/tabegochi";

export interface TabeGochiCloudState {
  pets: TabeGochiPet[];
  activePetId: string;
  coins: number;
  inventory: string[];
  updatedAt: number;
  dismissedPetIds?: string[];
}

const INVENTORY_SYNC_ITEM_TYPE = "tabegochi_save";

/**
 * Recupera el estado de TabeGochi desde la nube (Supabase).
 * Utiliza fallback resiliente: primero tabegochi_pets, luego user_inventory.
 */
export async function fetchTabeGochiCloud(userId: string): Promise<TabeGochiCloudState | null> {
  if (!userId) return null;

  // 1. Intento primario: tabla dedicada tabegochi_pets
  try {
    const { data, error } = await supabase
      .from("tabegochi_pets" as any)
      .select("state, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data?.state) {
      const stateObj = data.state as any;
      if (Array.isArray(stateObj?.pets)) {
        return {
          pets: stateObj.pets,
          activePetId: stateObj.activePetId || (stateObj.pets[0]?.id || ""),
          coins: typeof stateObj.coins === "number" ? stateObj.coins : 50,
          inventory: Array.isArray(stateObj.inventory) ? stateObj.inventory : ["apple", "room"],
          updatedAt: typeof stateObj.updatedAt === "number" ? stateObj.updatedAt : Date.now(),
          dismissedPetIds: Array.isArray(stateObj.dismissedPetIds) ? stateObj.dismissedPetIds : [],
        };
      }
    }
  } catch {
    // Si la tabla no está migrada aún, pasar a fallback silenciosamente
  }

  // 2. Fallback resiliente: user_inventory (tabla existente con RLS verificado)
  try {
    const { data, error } = await supabase
      .from("user_inventory")
      .select("id, item_id, quantity, updated_at")
      .eq("user_id", userId)
      .eq("item_type", INVENTORY_SYNC_ITEM_TYPE)
      .maybeSingle();

    if (!error && data?.item_id) {
      const parsed = JSON.parse(data.item_id);
      if (parsed && Array.isArray(parsed.pets)) {
        return {
          pets: parsed.pets,
          activePetId: parsed.activePetId || (parsed.pets[0]?.id || ""),
          coins: typeof parsed.coins === "number" ? parsed.coins : (data.quantity || 50),
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : ["apple", "room"],
          updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
          dismissedPetIds: Array.isArray(parsed.dismissedPetIds) ? parsed.dismissedPetIds : [],
        };
      }
    }
  } catch (err) {
    console.warn("[TabeGochiSync] Error recuperando estado de user_inventory:", err);
  }

  return null;
}

/**
 * Guarda el estado de TabeGochi en la nube (Supabase).
 * Guarda de forma atómica y silenciosa con fallback automático.
 */
export async function saveTabeGochiCloud(userId: string, state: TabeGochiCloudState): Promise<boolean> {
  if (!userId) return false;

  const payload = {
    ...state,
    updatedAt: state.updatedAt || Date.now(),
  };

  // 1. Intento primario: tabla tabegochi_pets
  try {
    const { error } = await supabase
      .from("tabegochi_pets" as any)
      .upsert(
        {
          user_id: userId,
          state: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (!error) {
      return true;
    }
  } catch {
    // Pasar a fallback silenciosamente
  }

  // 2. Fallback resiliente: user_inventory
  try {
    const { data: existing } = await supabase
      .from("user_inventory")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", INVENTORY_SYNC_ITEM_TYPE)
      .maybeSingle();

    const jsonString = JSON.stringify(payload);

    if (existing?.id) {
      const { error } = await supabase
        .from("user_inventory")
        .update({
          item_id: jsonString,
          quantity: payload.coins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return !error;
    } else {
      const { error } = await supabase
        .from("user_inventory")
        .insert({
          user_id: userId,
          item_type: INVENTORY_SYNC_ITEM_TYPE,
          item_id: jsonString,
          quantity: payload.coins,
        });

      return !error;
    }
  } catch (err) {
    console.warn("[TabeGochiSync] Fallback de guardado en nube:", err);
    return false;
  }
}

/**
 * Escucha cambios en tiempo real desde otros dispositivos (ej: teléfono o notebook)
 */
export function subscribeTabeGochiRemoteChanges(
  userId: string,
  onRemoteChange: (remoteState: TabeGochiCloudState) => void
): () => void {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`tabegochi_cloud_sync_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_inventory",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.item_type === INVENTORY_SYNC_ITEM_TYPE && row.item_id) {
          try {
            const parsed = JSON.parse(row.item_id);
            if (parsed && Array.isArray(parsed.pets)) {
              onRemoteChange(parsed);
            }
          } catch {}
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tabegochi_pets",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row?.state && Array.isArray(row.state.pets)) {
          onRemoteChange(row.state);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
