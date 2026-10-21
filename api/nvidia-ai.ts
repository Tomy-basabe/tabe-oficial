
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const key = process.env.NVIDIA_API_KEY;
  if (!key) return res.status(500).json({ error: "NVIDIA_API_KEY no configurada en el servidor" });

  // Solo usuarios logueados en TABE pueden usar el proxy (evita que terceros gasten la clave)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const bearer = String(req.headers?.authorization || "");
  if (!bearer.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: bearer, apikey: anonKey },
  }).catch(() => null);
  if (!userRes?.ok) return res.status(401).json({ error: "Sesión inválida" });

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

    if (parsedBody.action === "image") {
      const imgRes = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prompt: parsedBody.prompt,
          mode: "base",
          cfg_scale: parsedBody.cfg_scale ?? 3.5,
          width: parsedBody.width ?? 1024,
          height: parsedBody.height ?? 1024,
          seed: parsedBody.seed ?? Math.floor(Math.random() * 900000),
          steps: parsedBody.steps ?? 20,
        }),
      });
      const imgText = await imgRes.text();
      res.statusCode = imgRes.status;
      res.setHeader("Content-Type", "application/json");
      return res.end(imgText);
    }

    const chatRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: parsedBody.stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(parsedBody),
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
