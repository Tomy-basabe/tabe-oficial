const ALLOWED_ORIGINS = [
  "https://tabe.com.ar",
  "https://www.tabe.com.ar",
  "https://tabe-oficial.vercel.app",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function getAllowedOrigin(origin?: string): string {
  if (!origin) return ALLOWED_ORIGINS[0];
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/([a-z0-9-]+\.)?tabe\.com\.ar$/i.test(origin) ||
    /^https:\/\/tabe(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

// Rate limiter en memoria por usuario para mitigar Denial of Wallet (DoW)
const userRateBuckets = new Map<string, { chat: number[]; image: number[] }>();

function checkUserRateLimit(userId: string, isImage: boolean): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minuto
  let bucket = userRateBuckets.get(userId);
  if (!bucket) {
    bucket = { chat: [], image: [] };
    userRateBuckets.set(userId, bucket);
  }

  bucket.chat = bucket.chat.filter((t) => now - t < windowMs);
  bucket.image = bucket.image.filter((t) => now - t < windowMs);

  if (isImage) {
    if (bucket.image.length >= 4) return false;
    bucket.image.push(now);
    return true;
  } else {
    if (bucket.chat.length >= 25) return false;
    bucket.chat.push(now);
    return true;
  }
}

export default async function handler(req: any, res: any) {
  const allowedOrigin = getAllowedOrigin(req.headers?.origin);
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawKey = process.env.NVIDIA_API_KEY || "";
  const key = rawKey.replace(/^["']|["']$/g, "").trim();
  if (!key) return res.status(500).json({ error: "NVIDIA_API_KEY no configurada en el servidor" });

  const DEFAULT_SUPABASE_URL = "https://ndmjrcinfugswtlknebl.supabase.co";
  const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWpyY2luZnVnc3d0bGtuZWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQzNTQsImV4cCI6MjA4NjQwMDM1NH0.WyraOyLFgUPz-PncB2qTYHwY60c0opLB0yWLc_6iBcs";
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_ANON_KEY;
  const bearer = String(req.headers?.authorization || "");

  if (!bearer.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = bearer.slice(7).trim();
  let userId = "guest";

  if (token === anonKey || token === DEFAULT_ANON_KEY) {
    const rawIp = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "guest";
    userId = "guest_" + String(rawIp).split(",")[0].trim().slice(0, 32);
  } else {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: bearer, apikey: anonKey },
    }).catch(() => null);

    if (userRes?.ok) {
      const userData = await userRes.json().catch(() => null);
      userId = userData?.id || "guest";
    } else {
      const rawIp = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "guest";
      userId = "guest_" + String(rawIp).split(",")[0].trim().slice(0, 32);
    }
  }

  try {
    const queryAction = req.query?.action;

    if (req.method === "GET" || queryAction === "models") {
      const modelsRes = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await modelsRes.json();
      return res.status(modelsRes.status).json(data);
    }

    const parsedBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const isImageAction = parsedBody.action === "image";

    if (!checkUserRateLimit(userId, isImageAction)) {
      return res.status(429).json({
        error: "Demasiadas solicitudes seguidas. Esperá unos segundos antes de continuar.",
      });
    }

    if (isImageAction) {
      const prompt = String(parsedBody.prompt || "").trim().slice(0, 1500);
      if (!prompt) {
        return res.status(400).json({ error: "El prompt de imagen es obligatorio" });
      }

      const imgRes = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prompt,
          mode: "base",
          cfg_scale: Math.min(Math.max(Number(parsedBody.cfg_scale) || 3.5, 1), 10),
          width: Math.min(Math.max(Number(parsedBody.width) || 1024, 256), 1024),
          height: Math.min(Math.max(Number(parsedBody.height) || 1024, 256), 1024),
          seed: parsedBody.seed ?? Math.floor(Math.random() * 900000),
          steps: Math.min(Math.max(Number(parsedBody.steps) || 20, 1), 28),
        }),
      });
      const imgText = await imgRes.text();
      res.statusCode = imgRes.status;
      res.setHeader("Content-Type", "application/json");
      return res.end(imgText);
    }

    // Limitar max_tokens y cantidad de mensajes para evitar abuso de cuota (Denial of Wallet)
    const safeMaxTokens = Math.min(Math.max(Number(parsedBody.max_tokens) || 2048, 64), 16384);
    const rawMessages = Array.isArray(parsedBody.messages) ? parsedBody.messages.slice(-30) : [];
    const safeMessages = rawMessages.map((m: any) => ({
      role: m?.role === "system" || m?.role === "assistant" ? m.role : "user",
      content: typeof m?.content === "string" ? m.content.slice(0, 24000) : m?.content,
    }));

    const sanitizedPayload = {
      ...parsedBody,
      messages: safeMessages,
      max_tokens: safeMaxTokens,
    };

    const chatRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: parsedBody.stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(sanitizedPayload),
    });

    res.statusCode = chatRes.status;
    res.setHeader(
      "Content-Type",
      chatRes.headers.get("content-type") || (parsedBody.stream ? "text/event-stream" : "application/json")
    );

    if (!chatRes.body) {
      const errText = await chatRes.text();
      return res.end(errText);
    }

    const reader = chatRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    return res.end();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al conectar con NVIDIA NIM API" });
  }
}
