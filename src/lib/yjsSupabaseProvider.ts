import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Codifica un Uint8Array a cadena Base64 para transporte seguro vía Supabase Realtime Broadcast
 */
export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
}

/**
 * Decodifica una cadena Base64 a Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface YjsProviderUserMeta {
  name: string;
  color: string;
  avatarUrl?: string | null;
}

export interface YjsSupabaseProviderOptions {
  documentId: string;
  doc?: Y.Doc;
  userId: string;
  userMeta: YjsProviderUserMeta;
  onStatusChange?: (connected: boolean) => void;
  onCollaboratorsChange?: (users: any[]) => void;
}

/**
 * Provider industrial que conecta Yjs con Supabase Realtime Broadcast
 * Implementa el protocolo de sincronización CRDT formal con State Vectors y Awareness
 */
export class YjsSupabaseProvider {
  public doc: Y.Doc;
  public awareness: Awareness;
  public channel: RealtimeChannel | null = null;
  public documentId: string;
  public userId: string;
  public userMeta: YjsProviderUserMeta;
  private destroyed: boolean = false;
  private isConnected: boolean = false;
  private isExternalDoc: boolean = false;
  private onStatusChange?: (connected: boolean) => void;
  private onCollaboratorsChange?: (users: any[]) => void;

  constructor({
    documentId,
    doc,
    userId,
    userMeta,
    onStatusChange,
    onCollaboratorsChange,
  }: YjsSupabaseProviderOptions) {
    this.documentId = documentId;
    this.userId = userId;
    this.userMeta = userMeta;
    this.isExternalDoc = !!doc;
    this.doc = doc || new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.onStatusChange = onStatusChange;
    this.onCollaboratorsChange = onCollaboratorsChange;

    // Configurar estado inicial de awareness del usuario local
    this.awareness.setLocalStateField("user", {
      name: userMeta.name,
      color: userMeta.color,
      avatarUrl: userMeta.avatarUrl,
    });

    this.initRealtime();
    this.bindDocEvents();
    this.bindAwarenessEvents();
  }

  private bindDocEvents() {
    this.doc.on("update", (update: Uint8Array, origin: any) => {
      // Ignorar actualizaciones provenientes del canal remoto
      if (origin === "supabase-realtime" || this.destroyed || !this.channel || !this.isConnected) {
        return;
      }
      try {
        const base64Update = uint8ArrayToBase64(update);
        this.channel.send({
          type: "broadcast",
          event: "yjs-update",
          payload: {
            update: base64Update,
            senderId: this.userId,
            pageId: this.documentId,
          },
        });
      } catch (err) {
        console.warn("YjsProvider: error enviando broadcast update:", err);
      }
    });
  }

  private bindAwarenessEvents() {
    this.awareness.on("update", ({ added, updated, removed }: any, origin: any) => {
      if (origin === "supabase-realtime" || this.destroyed || !this.channel || !this.isConnected) {
        return;
      }
      try {
        const changedClients = added.concat(updated).concat(removed);
        const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changedClients);
        const base64Update = uint8ArrayToBase64(awarenessUpdate);
        this.channel.send({
          type: "broadcast",
          event: "yjs-awareness",
          payload: {
            update: base64Update,
            senderId: this.userId,
            pageId: this.documentId,
          },
        });
      } catch (err) {
        console.warn("YjsProvider: error enviando broadcast awareness:", err);
      }
    });
  }

  private initRealtime() {
    const channelName = `apunte-cooperativo:${this.documentId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.userId },
        broadcast: { ack: false, self: false },
      },
    });

    // 1. Presencia de colaboradores en la sala
    this.channel
      .on("presence", { event: "sync" }, () => {
        if (!this.channel || this.destroyed) return;
        const state = this.channel.presenceState();
        const users: any[] = [];
        const seenIds = new Set<string>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            if (!seenIds.has(p.user_id)) {
              seenIds.add(p.user_id);
              users.push({
                user_id: p.user_id,
                name: p.name || "Compañero",
                avatar_url: p.avatar_url || null,
                color: p.color,
                currentPageId: p.currentPageId || this.documentId,
                joined_at: p.joined_at || Date.now(),
              });
            }
          }
        });

        this.onCollaboratorsChange?.(users);
      })
      .on("presence", { event: "leave" }, () => {
        if (!this.channel || this.destroyed) return;
        const state = this.channel.presenceState();
        const users: any[] = [];
        const seenIds = new Set<string>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            if (!seenIds.has(p.user_id)) {
              seenIds.add(p.user_id);
              users.push({
                user_id: p.user_id,
                name: p.name || "Compañero",
                avatar_url: p.avatar_url || null,
                color: p.color,
                currentPageId: p.currentPageId || this.documentId,
                joined_at: p.joined_at || Date.now(),
              });
            }
          }
        });

        this.onCollaboratorsChange?.(users);
      });

    // 2. Recepción de updates binarios de Yjs (CRDT)
    this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      if (!payload || payload.senderId === this.userId || this.destroyed) return;
      if (payload.pageId && payload.pageId !== this.documentId) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, "supabase-realtime");
      } catch (err) {
        console.warn("YjsProvider: error aplicando yjs-update remoto:", err);
      }
    });

    // 3. Recepción de awareness (cursores remotos)
    this.channel.on("broadcast", { event: "yjs-awareness" }, ({ payload }) => {
      if (!payload || payload.senderId === this.userId || this.destroyed) return;
      if (payload.pageId && payload.pageId !== this.documentId) return;
      try {
        const update = base64ToUint8Array(payload.update);
        applyAwarenessUpdate(this.awareness, update, "supabase-realtime");
      } catch (err) {
        console.warn("YjsProvider: error aplicando yjs-awareness remoto:", err);
      }
    });

    // 4. Sincronización inicial bidireccional (Sync Step 1 y 2)
    this.channel.on("broadcast", { event: "yjs-sync-step-1" }, ({ payload }) => {
      if (!payload || payload.senderId === this.userId || this.destroyed || !this.channel) return;
      if (payload.pageId && payload.pageId !== this.documentId) return;
      try {
        const remoteVector = base64ToUint8Array(payload.vector);
        const missingUpdate = Y.encodeStateAsUpdate(this.doc, remoteVector);
        if (missingUpdate.byteLength > 0) {
          this.channel.send({
            type: "broadcast",
            event: "yjs-sync-step-2",
            payload: {
              update: uint8ArrayToBase64(missingUpdate),
              targetId: payload.senderId,
              senderId: this.userId,
              pageId: this.documentId,
            },
          });
        }
      } catch (err) {
        console.warn("YjsProvider: error procesando yjs-sync-step-1:", err);
      }
    });

    this.channel.on("broadcast", { event: "yjs-sync-step-2" }, ({ payload }) => {
      if (!payload || payload.senderId === this.userId || this.destroyed) return;
      if (payload.pageId && payload.pageId !== this.documentId) return;
      if (payload.targetId && payload.targetId !== this.userId) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, "supabase-realtime");
      } catch (err) {
        console.warn("YjsProvider: error aplicando yjs-sync-step-2:", err);
      }
    });

    // Al unirse un nuevo participante, emitir vector de estado para sincronizarlo de inmediato
    this.channel.on("presence", { event: "join" }, ({ newPresences }) => {
      if (this.destroyed || !this.channel || !this.isConnected) return;
      const hasOther = (newPresences || []).some((p: any) => p.user_id !== this.userId);
      if (hasOther) {
        try {
          const localVector = Y.encodeStateVector(this.doc);
          this.channel.send({
            type: "broadcast",
            event: "yjs-sync-step-1",
            payload: {
              vector: uint8ArrayToBase64(localVector),
              senderId: this.userId,
              pageId: this.documentId,
            },
          });
        } catch (e) {}
      }
    });

    // Suscripción al canal
    this.channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && !this.destroyed) {
        this.isConnected = true;
        this.onStatusChange?.(true);

        try {
          await this.channel?.track({
            user_id: this.userId,
            name: this.userMeta.name,
            color: this.userMeta.color,
            avatar_url: this.userMeta.avatarUrl,
            currentPageId: this.documentId,
            joined_at: Date.now(),
          });

          // Disparar Sync Step 1 para solicitar deltas a los peers conectados
          const localVector = Y.encodeStateVector(this.doc);
          this.channel?.send({
            type: "broadcast",
            event: "yjs-sync-step-1",
            payload: {
              vector: uint8ArrayToBase64(localVector),
              senderId: this.userId,
              pageId: this.documentId,
            },
          });

          // Emitir awareness local inicial
          const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
          this.channel?.send({
            type: "broadcast",
            event: "yjs-awareness",
            payload: {
              update: uint8ArrayToBase64(awarenessUpdate),
              senderId: this.userId,
              pageId: this.documentId,
            },
          });
        } catch (e) {
          console.warn("YjsProvider: error en handshake inicial:", e);
        }
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this.isConnected = false;
        this.onStatusChange?.(false);
      }
    });
  }

  public destroy() {
    this.destroyed = true;
    this.isConnected = false;
    this.awareness.destroy();
    if (this.channel) {
      this.channel.untrack().catch(() => {});
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (!this.isExternalDoc) {
      this.doc.destroy();
    }
  }
}
