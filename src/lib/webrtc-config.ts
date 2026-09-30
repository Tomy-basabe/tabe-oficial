export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        // Google Public STUN Servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },

        // Twilio & Cloudflare STUN Servers (para resolver NATs globales)
        { urls: "stun:global.stun.twilio.com:3478" },
        { urls: "stun:stun.cloudflare.com:3478" },

        // Metered.ca Free Public & OpenRelay TURN servers (NAT simétrico y Firewalls móviles/universitarios)
        {
            urls: [
                "turn:a.relay.metered.ca:80",
                "turn:a.relay.metered.ca:443",
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443"
            ],
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
        {
            urls: [
                "turn:a.relay.metered.ca:80?transport=tcp",
                "turn:a.relay.metered.ca:443?transport=tcp",
                "turns:a.relay.metered.ca:443?transport=tcp",
                "turns:openrelay.metered.ca:443?transport=tcp"
            ],
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require"
};
