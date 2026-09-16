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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const cors = getCorsHeaders(req);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "send_to_user";

    // ───────────────── 1. SEND TEST OR DIRECT PUSH TO USER ─────────────────
    if (action === "send_to_user" || action === "test_push") {
      const userId = body.user_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (subsErr) throw subsErr;
      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "No se encontraron suscripciones Web Push activas para este usuario. Asegúrate de habilitar notificaciones en el dispositivo." 
        }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const payload = JSON.stringify({
        title: body.title || "T.A.B.E. 🎓",
        body: body.body || "¡Las notificaciones en segundo plano están funcionando con la app cerrada!",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: body.tag || ("tabe-" + Date.now()),
        url: body.url || "/dashboard",
        timestamp: Date.now()
      });

      let sentCount = 0;
      let expiredCount = 0;

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
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            expiredCount++;
          }
        }
      }

      return new Response(JSON.stringify({
        success: sentCount > 0,
        sent: sentCount,
        expired_cleaned: expiredCount,
        total_devices: subs.length,
        message: sentCount > 0 
          ? `Notificación Web Push enviada con éxito a ${sentCount} dispositivo(s).`
          : "No se pudo entregar la notificación a los dispositivos registrados."
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
