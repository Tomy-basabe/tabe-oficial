/**
 * Configuración ICE de Tabetalk.
 *
 * - STUN alcanza cuando al menos uno de los dos participantes tiene un NAT "amigable".
 * - Con CGNAT (redes móviles 4G/5G y varios ISP) o NAT simétrico hace falta un servidor TURN
 *   que retransmita el audio/video. Sin TURN, la señalización funciona (se ve "Hablando")
 *   pero el medio nunca llega.
 *
 * Para usar un TURN propio (Metered, Twilio, Cloudflare Calls, coturn...) definí en `.env`:
 *   VITE_TURN_URLS=turn:host:3478,turn:host:443?transport=tcp,turns:host:443?transport=tcp
 *   VITE_TURN_USERNAME=usuario
 *   VITE_TURN_CREDENTIAL=clave
 * Si no están definidas, se usa el relay público de OpenRelay como respaldo (sin garantías).
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
    : [{
        urls: [
            "turn:openrelay.metered.ca:80",
            "turn:openrelay.metered.ca:443",
            "turn:openrelay.metered.ca:443?transport=tcp",
            "turns:openrelay.metered.ca:443?transport=tcp",
        ],
        username: "openrelayproject",
        credential: "openrelayproject",
    }];

export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        // STUN públicos (Google, Cloudflare, Twilio)
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:global.stun.twilio.com:3478" },
        ...TURN_SERVERS,
    ],
    iceCandidatePoolSize: 2,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
};
