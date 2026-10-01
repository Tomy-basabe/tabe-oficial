/* REGLA ARQUITECTÓNICA: NINGÚN COMPONENTE VISUAL, HOOK O FUNCIONALIDAD PÚBLICA DEBE CONDICIONARSE AL ROL ADMIN. TODOS LOS USUARIOS USAN LA MISMA UI Y LÓGICA DE NEGOCIO SALVO LA RUTA PRIVADA /admin */

import { createServerClient } from "@supabase/ssr";

// Super admin email / IDs for exclusive /admin access
const SUPER_ADMIN_EMAILS = ["basabetomas09@gmail.com"];
const SUPER_ADMIN_IDS = ["47c2a694-d1f2-4a4b-b37f-45e37ea010c6"];

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Redirección canónica estricta tabe.software -> tabe.com.ar
  const host = request.headers.get("host") || "";
  if (host.includes("tabe.software")) {
    const destination = new URL(request.url);
    destination.host = "tabe.com.ar";
    destination.protocol = "https:";
    return Response.redirect(destination.toString(), 301);
  }

  // Archivos estáticos o internos pasan directamente
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/screenshots") ||
    pathname.includes(".")
  ) {
    return;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieHeader.split(";").map((c) => {
          const [name, ...rest] = c.trim().split("=");
          return { name, value: rest.join("=") };
        }).filter(c => Boolean(c.name));
      },
      setAll() {
        // En middleware de validación no modificamos cookies
      },
    },
  });

  // Validar sesión contra el servidor con getUser() de manera consistente
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Acceso exclusivo a /admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return Response.redirect(new URL("/registro", request.url));
    }
    const emailMatch = user.email ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim()) : false;
    const idMatch = user.id ? SUPER_ADMIN_IDS.includes(user.id) : false;
    if (!emailMatch && !idMatch) {
      return Response.redirect(new URL("/dashboard", request.url));
    }
    return;
  }

  // 2. Rutas protegidas regulares (/dashboard, /tabetalk, /pomodoro, /metricas, etc.)
  // REGLA: Acceso idéntico e irrestricto sin condicionar por rol
  return;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
