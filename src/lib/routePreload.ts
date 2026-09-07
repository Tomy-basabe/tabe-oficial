// Ultra-fast route preloader on hover/focus to eliminate navigation delays
const routeLoaders: Record<string, () => Promise<any>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/carrera": () => import("@/pages/CareerPlan"),
  "/calendario": () => import("@/pages/Calendar"),
  "/pomodoro": () => import("@/pages/Pomodoro"),
  "/metricas": () => import("@/pages/Metrics"),
  "/asistente": () => import("@/pages/AIAssistant"),
  "/TABEAI": () => import("@/pages/AIAssistant"),
  "/flashcards": () => import("@/pages/Flashcards"),
  "/cuestionarios": () => import("@/pages/Quizzes"),
  "/marketplace": () => import("@/pages/Marketplace"),
  "/biblioteca": () => import("@/pages/Library"),
  "/logros": () => import("@/pages/Achievements"),
  "/notion": () => import("@/pages/Notion"),
  "/apuntes": () => import("@/pages/Notion"),
  "/examenes": () => import("@/pages/Exams"),
  "/amigos": () => import("@/pages/Friends"),
  "/configuracion": () => import("@/pages/Settings"),
  "/admin": () => import("@/pages/AdminPanel"),
  "/bosque": () => import("@/pages/Forest"),
  "/rutinas": () => import("@/pages/Routines"),
  "/discord": () => import("@/pages/Discord"),
  "/mapa": () => import("@/pages/CorrelativityMap"),
  "/consultas": () => import("@/pages/OfficeHours"),
  "/juegos": () => import("@/pages/Games"),
};

const preloadedRoutes = new Set<string>();

export function preloadRoute(path: string) {
  if (!path || preloadedRoutes.has(path)) return;
  const loader = routeLoaders[path];
  if (loader) {
    preloadedRoutes.add(path);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        loader().catch(() => {});
      });
    } else {
      setTimeout(() => {
        loader().catch(() => {});
      }, 0);
    }
  }
}
