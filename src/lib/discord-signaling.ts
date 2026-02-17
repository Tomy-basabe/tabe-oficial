import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Access existing supabase client to avoid creating multiple instances/auth issues
import { supabase } from "@/integrations/supabase/client";

interface SignalingHandlers {
    onOffer: (offer: RTCSessionDescriptionInit, senderId: string) => void;
    onAnswer: (answer: RTCSessionDescriptionInit, senderId: string) => void;
    onIceCandidate: (candidate: RTCIceCandidateInit, senderId: string) => void;
    onUserJoined?: (userId: string) => void;
    onUserLeft?: (userId: string) => void;
}

export class VideoSignaling {
    private channel: RealtimeChannel | null = null;
    private channelId: string;
    private userId: string;
    private handlers: SignalingHandlers;

    constructor(channelId: string, userId: string, handlers: SignalingHandlers) {
        this.channelId = channelId;
        this.userId = userId;
        this.handlers = handlers;
    }

    async connect() {
        console.log(`[Signaling] Conectando al canal: video-${this.channelId}`);

        // Check if channel already exists? Supabase handles this.
        this.channel = supabase.channel(`video-${this.channelId}`, {
            config: {
                broadcast: { self: false }, // No recibir nuestros propios mensajes
                presence: { key: this.userId },
            },
        });

        // Manejar mensajes de señalización
        this.channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
            // console.log('[Signaling] Mensaje recibido:', payload.type, 'de', payload.userId);

            // Verificar que no sea nuestro propio mensaje (doble check)
            if (payload.userId === this.userId) {
                return;
            }

            switch (payload.type) {
                case 'offer':
                    this.handlers.onOffer(payload.offer, payload.userId);
                    break;
                case 'answer':
                    this.handlers.onAnswer(payload.answer, payload.userId);
                    break;
                case 'ice-candidate':
                    this.handlers.onIceCandidate(payload.candidate, payload.userId);
                    break;
                default:
                    console.warn('[Signaling] Tipo de mensaje desconocido:', payload.type);
            }
        });

        // Manejar presencia (usuarios uniéndose/saliendo)
        this.channel.on('presence', { event: 'join' }, ({ key }) => {
            console.log('[Signaling] Usuario unido:', key);
            if (key !== this.userId) {
                this.handlers.onUserJoined?.(key);
            }
        });

        this.channel.on('presence', { event: 'leave' }, ({ key }) => {
            console.log('[Signaling] Usuario salió:', key);
            if (key !== this.userId) {
                this.handlers.onUserLeft?.(key);
            }
        });

        // Suscribirse al canal
        const status = await this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Signaling] Suscrito exitosamente');

                // Trackear presencia
                await this.channel!.track({
                    user_id: this.userId,
                    online_at: new Date().toISOString(),
                });
            } else if (status === 'CHANNEL_ERROR') {
                console.error('[Signaling] Error en el canal');
            } else if (status === 'TIMED_OUT') {
                console.error('[Signaling] Timeout en la suscripción');
            }
        });

        return status;
    }

    async send(message: any) {
        if (!this.channel) {
            console.error('[Signaling] No hay canal activo para enviar mensaje');
            return;
        }

        const payload = {
            ...message,
            userId: this.userId,
            timestamp: Date.now(),
        };

        // console.log('[Signaling] Enviando mensaje:', payload.type);

        await this.channel.send({
            type: 'broadcast',
            event: 'signaling',
            payload,
        });
    }

    async disconnect() {
        if (this.channel) {
            console.log('[Signaling] Desconectando del canal');

            await this.channel.untrack();
            await this.channel.unsubscribe();
            this.channel = null;
        }
    }

    getPresence() {
        if (!this.channel) return [];

        const presenceState = this.channel.presenceState();
        return Object.keys(presenceState);
    }
}
