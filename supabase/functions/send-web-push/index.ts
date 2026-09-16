import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGINS = [
  "https://www.tabe.software",
  "https://tabe.software",
  "https://tabe-oficial.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "X-Content-Type-Options": "nosniff"
  };
}

const VAPID_PUBLIC_KEY = "BNaibveUWxGdggaWEWGFg07YbIg5feJ67xDzCcf41L8J8W93Xf-89LJWZZl_kVYN9ZZZ8XnrXkXuP2Us_BP15Qg";
const VAPID_PRIVATE_KEY = "vlJOxv6GvlLobTIITI0iTC7byz6tCvNm2vo4o4LjuT8";
const VAPID_SUBJECT = "mailto:soporte@tabe.software";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Reusable helper to send Web Push to all active devices of a user
async function sendPushToUser(
  supabase: any,
  userId: string,
  payloadData: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  }
) {
  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (subsErr) throw subsErr;
  if (!subs || subs.length === 0) {
    return {
      success: false,
      sent: 0,
      total_devices: 0,
      message: "No se encontraron dispositivos registrados con Web Push para este usuario."
    };
  }

  const payload = JSON.stringify({
    title: payloadData.title || "T.A.B.E. 🎓",
    body: payloadData.body || "¡Las notificaciones en segundo plano están funcionando con la app cerrada!",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: payloadData.tag || ("tabe-" + Date.now()),
    url: payloadData.url || "/dashboard",
    timestamp: Date.now()
  });

  let sentCount = 0;
  let expiredCount = 0;
  const sendErrors: any[] = [];

  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sentCount++;
    } catch (err: any) {
      console.warn("Failed to send webpush to endpoint:", sub.endpoint, err?.statusCode || err?.message);
      sendErrors.push({
        endpoint: sub.endpoint,
        statusCode: err?.statusCode,
        message: err?.message,
        body: err?.body
      });
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        expiredCount++;
      }
    }
  }

  return {
    success: sentCount > 0,
    sent: sentCount,
    expired_cleaned: expiredCount,
    total_devices: subs.length,
    errors: sendErrors.length > 0 ? sendErrors : undefined,
    message: sentCount > 0
      ? `Notificación enviada con éxito a ${sentCount} dispositivo(s).`
      : "No se pudo entregar la notificación a los dispositivos registrados."
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const cors = getCorsHeaders(req);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "send_to_user";

    // ───────────────── 0. SAVE PUSH SUBSCRIPTION (BYPASS RLS VIA SERVICE ROLE) ─────────────────
    if (action === "save_subscription") {
      const { user_id, endpoint, p256dh, auth, user_agent } = body;
      if (!user_id || !endpoint || !p256dh || !auth) {
        return new Response(JSON.stringify({ error: "Missing required subscription fields" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id,
          endpoint,
          p256dh,
          auth,
          user_agent: user_agent || "",
          updated_at: new Date().toISOString()
        }, { onConflict: "endpoint" })
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: "Suscripción Web Push guardada exitosamente en el servidor",
        data
      }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // ───────────────── 1. SEND IMMEDIATE PUSH TO USER ─────────────────
    if (action === "send_to_user" || action === "test_push") {
      const userId = body.user_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const result = await sendPushToUser(supabase, userId, {
        title: body.title,
        body: body.body,
        url: body.url,
        tag: body.tag
      });

      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // ───────────────── 2. SCHEDULE DELAYED PUSH (E.G. 3 MINUTES AFTER ACTIVATION) ─────────────────
    if (action === "schedule_delayed_greeting" || action === "schedule_delayed_push") {
      const userId = body.user_id;
      const delaySeconds = Math.max(5, Math.min(300, Number(body.delay_seconds) || 180)); // 3 minutos por defecto (180 seg)
      const title = body.title || "¡Hola de parte de TABE! 👋";
      const pushBody = body.body || "¡Funciona perfecto! Esta notificación te llegó 3 minutos después con la app cerrada. Ya estás al día con tus parciales y tareas.";
      const url = body.url || "/configuracion";

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      console.log(`[Scheduled Push] Initiating delayed push for user ${userId} in ${delaySeconds} seconds`);

      // 1. Enviar notificación push instantánea de confirmación para que el usuario compruebe que su cel recibe pushes
      try {
        await sendPushToUser(supabase, userId, {
          title: "¡Dispositivo Vinculado a TABE! 🎓",
          body: "¡Las notificaciones funcionan! Cerrá la app ahora: en 3 minutos te enviaremos el saludo de prueba.",
          url: "/configuracion",
          tag: "instant-welcome-" + Date.now()
        });
      } catch (welcomeErr) {
        console.warn("[Scheduled Push] Error sending immediate welcome push:", welcomeErr);
      }

      // 2. Programar el saludo de los 3 minutos con chunks de keep-alive
      const delayedTask = async () => {
        try {
          console.log(`[Scheduled Push] Waiting ${delaySeconds}s for user ${userId}...`);
          const startTime = Date.now();
          const targetTime = startTime + delaySeconds * 1000;
          while (Date.now() < targetTime) {
            const sleepMs = Math.min(10000, targetTime - Date.now());
            if (sleepMs > 0) {
              await new Promise((r) => setTimeout(r, sleepMs));
            }
          }
          console.log(`[Scheduled Push] Sending 3-min delayed push now to user ${userId}`);
          const res = await sendPushToUser(supabase, userId, {
            title,
            body: pushBody,
            url,
            tag: "delayed-greeting-" + Date.now()
          });
          console.log(`[Scheduled Push] Sent result for ${userId}:`, res);
        } catch (err) {
          console.error(`[Scheduled Push] Error sending delayed push to ${userId}:`, err);
        }
      };

      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        // @ts-ignore
        EdgeRuntime.waitUntil(delayedTask());
      } else {
        delayedTask();
      }

      return new Response(JSON.stringify({
        success: true,
        delay_seconds: delaySeconds,
        scheduled_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
        message: `Notificación programada para dentro de ${Math.round(delaySeconds / 60)} minutos. ¡Ya podés cerrar la app o bloquear la pantalla para probar!`
      }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // ───────────────── 2. CHECK AND SEND PROACTIVE REMINDERS (BACKGROUND CRON) ─────────────────
    if (action === "check_and_send_all_reminders") {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      const { data: activeUsers, error: usersErr } = await supabase
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth, id");

      if (usersErr) throw usersErr;
      if (!activeUsers || activeUsers.length === 0) {
        return new Response(JSON.stringify({ message: "No active push subscriptions" }), {
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const userMap = new Map<string, typeof activeUsers>();
      for (const sub of activeUsers) {
        const list = userMap.get(sub.user_id) || [];
        list.push(sub);
        userMap.set(sub.user_id, list);
      }

      let totalSent = 0;

      for (const [userId, subs] of userMap.entries()) {
        try {
          const { data: exams } = await supabase
            .from("calendar_events")
            .select("titulo, tipo_examen, fecha, subjects(nombre)")
            .eq("user_id", userId)
            .eq("fecha", tomorrowStr)
            .neq("tipo_examen", "Estudio");

          let pushTitle = "";
          let pushBody = "";
          let pushUrl = "/dashboard";

          if (exams && exams.length > 0) {
            const ex = exams[0];
            const examType = ex.tipo_examen || "Examen";
            const subject = (ex as any).subjects?.nombre || ex.titulo;
            pushTitle = `📝 ${examType}: ${subject}`;
            pushBody = "Mañana tenés fecha de examen en TABE. ¡Hacé un repaso rápido para llegar al 100%!";
            pushUrl = "/calendario";
          } else {
            const { data: stats } = await supabase
              .from("user_stats")
              .select("racha_actual")
              .eq("user_id", userId)
              .maybeSingle();

            const { data: todaySessions } = await supabase
              .from("study_sessions")
              .select("id")
              .eq("user_id", userId)
              .eq("fecha", todayStr)
              .limit(1);

            if (stats && stats.racha_actual >= 2 && (!todaySessions || todaySessions.length === 0)) {
              pushTitle = "🔥 ¡Tu racha en TABE está en juego!";
              pushBody = `Llevás ${stats.racha_actual} días consecutivos. Dedicále 15 minutos hoy para no perderla.`;
              pushUrl = "/pomodoro";
            }
          }

          if (pushTitle) {
            const payload = JSON.stringify({
              title: pushTitle,
              body: pushBody,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: "reminder-" + todayStr,
              url: pushUrl,
              timestamp: Date.now()
            });

            for (const sub of subs) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
                totalSent++;
              } catch (err: any) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
              }
            }
          }
        } catch (uErr) {
          console.error(`Error processing reminders for user ${userId}:`, uErr);
        }
      }

      return new Response(JSON.stringify({ success: true, notifications_sent: totalSent }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("send-web-push error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
