const ALLOWED_ORIGINS = [
  "https://tabe.com.ar",
  "https://www.tabe.com.ar",
  "https://tabe.software",
  "https://www.tabe.software",
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
    /^https:\/\/([a-z0-9-]+\.)?tabe\.software$/i.test(origin) ||
    /^https:\/\/tabe(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

// Rate limiter en memoria para llamadas en vivo (alta frecuencia pero ráfagas controladas)
const liveRateBuckets = new Map<string, number[]>();

function checkLiveRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  let timestamps = liveRateBuckets.get(userId);
  if (!timestamps) {
    timestamps = [];
    liveRateBuckets.set(userId, timestamps);
  }
  timestamps = timestamps.filter((t) => now - t < windowMs);
  liveRateBuckets.set(userId, timestamps);

  if (timestamps.length >= 60) return false; // hasta 60 turnos de voz por minuto
  timestamps.push(now);
  return true;
}

const FAST_VOICE_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

export default async function handler(req: any, res: any) {
  const allowedOrigin = getAllowedOrigin(req.headers?.origin);
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const rawKey = process.env.GROQ_API_KEY || "";
  const groqKey = rawKey.replace(/^["']|["']$/g, "").trim();

  if (!groqKey) {
    return res.status(503).json({ error: "Motor de voz no disponible temporalmente" });
  }

  const DEFAULT_SUPABASE_URL = "https://ndmjrcinfugswtlknebl.supabase.co";
  const DEFAULT_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWpyY2luZnVnc3d0bGtuZWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQzNTQsImV4cCI6MjA4NjQwMDM1NH0.WyraOyLFgUPz-PncB2qTYHwY60c0opLB0yWLc_6iBcs";
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_ANON_KEY;
  const bearer = String(req.headers?.authorization || "");

  let userId = "guest";
  if (bearer.startsWith("Bearer ")) {
    const token = bearer.slice(7).trim();
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
      }
    }
  }

  if (!checkLiveRateLimit(userId)) {
    return res.status(429).json({
      error: "Muchas interacciones en poco tiempo. Esperá unos segundos.",
    });
  }

  const parsedBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const rawMessages = Array.isArray(parsedBody.messages) ? parsedBody.messages.slice(-12) : [];
  const systemPrompt = parsedBody.system_prompt || parsedBody.systemPrompt || "";

  const formattedMessages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    formattedMessages.push({
      role: "system",
      content: String(systemPrompt).slice(0, 15000),
    });
  }

  for (const m of rawMessages) {
    const role = m?.role === "system" || m?.role === "assistant" ? m.role : "user";
    const content = typeof m?.content === "string" ? m.content.slice(0, 8000) : String(m?.content || "");
    formattedMessages.push({ role, content });
  }

  // Motor ultra-rápido en cascada (<200ms TTFT)
  for (const model of FAST_VOICE_MODELS) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.2,
          max_tokens: 350, // Óptimo para audio en vivo conversacional sin demoras
          stream: true,
        }),
      });

      if (groqRes.ok && groqRes.body) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");

        const reader = groqRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        return res.end();
      }
    } catch (err) {
      console.warn(`[VoiceLive] Falló modelo ${model}:`, err);
    }
  }

  return res.status(502).json({ error: "No se pudo conectar con el motor de voz en vivo" });
}
