/**
 * notionSync.ts — Sincronización instantánea de apuntes entre pestañas vía BroadcastChannel.
 * Permite que cambios hechos en una pestaña aparezcan en tiempo real en las demás pestañas
 * abiertas en el mismo navegador, con CERO consumo de servidor, base de datos ni peticiones de red.
 */

export interface NotionSyncMessage {
  type: "DOC_UPDATED" | "DOC_DELETED";
  docId: string;
  content?: any;
  title?: string;
  emoji?: string;
  updatedAt?: string;
  tabId: string;
}

// Identificador único de pestaña para no procesar eventos emitidos por la misma pestaña
export const CURRENT_TAB_ID = `tab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

const CHANNEL_NAME = "tabe_notion_sync_channel";

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this environment:", e);
}

const listeners = new Set<(msg: NotionSyncMessage) => void>();

if (channel) {
  channel.onmessage = (event) => {
    const msg = event.data as NotionSyncMessage;
    if (!msg || msg.tabId === CURRENT_TAB_ID) return;
    listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error("Error in notionSync listener:", err);
      }
    });
  };
}

/**
 * Emite una actualización de documento a todas las demás pestañas abiertas del usuario.
 */
export function broadcastNotionDocUpdate(payload: {
  docId: string;
  content?: any;
  title?: string;
  emoji?: string;
  updatedAt?: string;
}) {
  const msg: NotionSyncMessage = {
    type: "DOC_UPDATED",
    docId: payload.docId,
    content: payload.content,
    title: payload.title,
    emoji: payload.emoji,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    tabId: CURRENT_TAB_ID,
  };

  // 1. BroadcastChannel (0ms, comunicación interna en memoria del navegador)
  if (channel) {
    try {
      channel.postMessage(msg);
    } catch (e) {
      console.warn("Failed to postMessage on BroadcastChannel:", e);
    }
  }

  // 2. Fallback de timestamp en localStorage por si otra pestaña reacciona al evento storage
  try {
    localStorage.setItem(`tabe_notion_last_update_${payload.docId}`, Date.now().toString());
  } catch {}
}

/**
 * Emite la eliminación de un documento a todas las demás pestañas.
 */
export function broadcastNotionDocDeleted(docId: string) {
  const msg: NotionSyncMessage = {
    type: "DOC_DELETED",
    docId,
    tabId: CURRENT_TAB_ID,
  };

  if (channel) {
    try {
      channel.postMessage(msg);
    } catch (e) {}
  }
}

/**
 * Suscribe un callback a las actualizaciones de otras pestañas.
 * Retorna la función de desuscripción.
 */
export function subscribeNotionSync(listener: (msg: NotionSyncMessage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
