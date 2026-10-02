export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        // Google Public STUN Servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },

        // Cloudflare & Twilio STUN Servers
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:global.stun.twilio.com:3478" },

        // OpenRelay Public TURN Relay (Fundamental para mÃ³viles con CGNAT 4G/5G y NAT simÃ©trico)
        {
            urls: [
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
                "turn:openrelay.metered.ca:443?transport=tcp",
                "turns:openrelay.metered.ca:443?transport=tcp"
            ],
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ],
    iceCandidatePoolSize: 2,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require"
};

