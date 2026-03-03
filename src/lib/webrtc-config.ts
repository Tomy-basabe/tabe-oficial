export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // Free OpenRelay TURN servers from Metered.ca
        // Using a more robust set of credentials from the existing hooks
        {
            urls: "turn:a.relay.metered.ca:80",
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
        {
            urls: "turn:a.relay.metered.ca:80?transport=tcp",
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
        {
            urls: "turn:a.relay.metered.ca:443",
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
        {
            urls: "turns:a.relay.metered.ca:443?transport=tcp",
            username: "e8dd65b92f535845a3b1a528",
            credential: "yIJOkLHEPc/MmhJJ",
        },
    ],
    iceCandidatePoolSize: 10,
};
