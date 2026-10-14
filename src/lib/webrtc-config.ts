/**
 * Configuración ICE y utilidades de optimización WebRTC de Tabetalk.
 *
 * Diseñado para garantizar conexión independiente de la red:
 * - STUN geo-distribuidos para conexiones directas P2P rápidas.
 * - Múltiples relays TURN en puertos 443 (TCP/TLS) y 80 para saltar NAT simétrico,
 *   redes móviles 4G/5G (CGNAT) y firewalls restrictivos que bloquean UDP.
 * - Optimización de SDP para habilitar Opus FEC (Forward Error Correction) ante pérdidas de paquetes.
 */

const envTurnUrls = ((import.meta.env.VITE_TURN_URLS as string | undefined) ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const TURN_SERVERS: RTCIceServer[] = envTurnUrls.length > 0
    ? [{
        urls: envTurnUrls,
        username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
        credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    }]
    : [
        // OpenRelay público con redundancia en puertos 443 y 80 (TCP y TLS para atravesar cualquier firewall)
        {
            urls: [
                "turns:openrelay.metered.ca:443?transport=tcp",
                "turn:openrelay.metered.ca:443?transport=tcp",
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
            ],
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ];

export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        // STUN geo-distribuidos y redundantes
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:global.stun.twilio.com:3478" },
        { urls: "stun:stun.nextcloud.com:443" },
        ...TURN_SERVERS,
    ],
    iceCandidatePoolSize: 4,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
};

/**
 * Optimiza el SDP (Session Description Protocol) para redes inestables:
 * - Habilita Opus inband FEC (Forward Error Correction) para reconstruir paquetes perdidos.
 * - Optimiza para voz monoaural (32 kbps de ancho de banda máximo, nítido y ultraliviano).
 */
export function optimizeSdp(sdp: string): string {
    if (!sdp) return sdp;

    // Modificar parámetros del códec Opus para resistencia a paquetes perdidos
    return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
        if (params.includes("minptime=") || sdp.includes(`a=rtpmap:${pt} opus/48000`)) {
            let updated = params;
            // Habilitar FEC (Forward Error Correction) si no está
            if (!updated.includes("useinbandfec=1")) {
                updated += ";useinbandfec=1";
            }
            // Forzar mono para voz humana (ahorra 50% de ancho de banda sin perder fidelidad)
            if (!updated.includes("stereo=0")) {
                updated += ";stereo=0";
            }
            // Limitar bitrate de voz a 32 kbps (ideal para cualquier 3G/4G/Wi-Fi)
            if (!updated.includes("maxaveragebitrate=")) {
                updated += ";maxaveragebitrate=32000";
            }
            return `a=fmtp:${pt} ${updated}`;
        }
        return match;
    });
}
