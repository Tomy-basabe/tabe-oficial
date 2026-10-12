import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers?.authorization;
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  const room = typeof req.body?.room === "string" ? req.body.room.trim() : "";
  const channelId = room.match(/^tabetalk-([0-9a-f-]{36})$/i)?.[1];

  if (!token || !channelId || !/^[a-zA-Z0-9:_-]{1,128}$/.test(room)) {
    return res.status(400).json({ error: "Solicitud de sala inválida" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!supabaseUrl || !supabaseKey || !livekitApiKey || !livekitApiSecret) {
    return res.status(503).json({ error: "El servicio de videollamada no está configurado" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Sesión no válida" });
    }

    const { data: channel, error: channelError } = await supabase
      .from("discord_channels")
      .select("id")
      .eq("id", channelId)
      .eq("type", "voice")
      .maybeSingle();

    if (channelError || !channel) {
      return res.status(403).json({ error: "No tienes acceso a este canal de voz" });
    }

    const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: data.user.id,
      name: data.user.user_metadata?.name || data.user.email || "Usuario",
      ttl: "2h",
    });

    accessToken.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.status(200).json({ token: await accessToken.toJwt() });
  } catch (error) {
    console.error("[LiveKit] Error creando token:", error);
    return res.status(500).json({ error: "No se pudo preparar la videollamada" });
  }
}