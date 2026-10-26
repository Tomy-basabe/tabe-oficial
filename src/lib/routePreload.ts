// Ultra-fast route preloader on hover/focus to eliminate navigation delays
const routeLoaders: Record<string, () => Promise<any>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/carrera": () => import("@/pages/CareerPlan"),
  "/campus": () => import("@/pages/MiCampus"),
  "/calendario": () => import("@/pages/Calendar"),
  "/pomodoro": () => import("@/pages/Pomodoro"),
  "/tareas": () => import("@/pages/Tasks"),
  "/metricas": () => import("@/pages/Metrics"),
  "/asistente": () => import("@/pages/AIAssistant"),
  "/TABEAI": () => import("@/pages/AIAssistant"),
  "/tabe-ai/examenes": () => import("@/pages/StudyRoadmapPage"),
  "/TABEAI/examenes": () => import("@/pages/StudyRoadmapPage"),
  "/flashcards": () => import("@/pages/Flashcards"),
  "/cuestionarios": () => import("@/pages/Quizzes"),
  "/marketplace": () => import("@/pages/Marketplace"),
  "/comunidad": () => import("@/pages/Marketplace"),
  "/biblioteca": () => import("@/pages/Library"),
  "/logros": () => import("@/pages/Achievements"),
  "/notion": () => import("@/pages/Notion"),
  "/apuntes": () => import("@/pages/Notion"),
  "/examenes": () => import("@/pages/Exams"),
  "/amigos": () => import("@/pages/Friends"),
  "/configuracion": () => import("@/pages/Settings"),
  "/tabe-admin": () => import("@/pages/AdminPanel"),
  "/bosque": () => import("@/pages/Forest"),
  "/rutinas": () => import("@/pages/Routines"),
  "/tabetalk": () => import("@/pages/Tabetalk"),
  "/discord": () => import("@/pages/Tabetalk"),
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
    loader().catch(() => {});
  }
}

// Background preload all sidebar pages after initial load so clicking any apartado is 0ms
export function preloadCoreRoutes() {
  if (typeof window === "undefined") return;
  const allRoutes = [
    "/apuntes",
    "/TABEAI",
    "/calendario",
    "/pomodoro",
    "/tareas",
    "/flashcards",
    "/cuestionarios",
    "/examenes",
    "/carrera",
    "/campus",
    "/biblioteca",
    "/rutinas",
    "/metricas",
    "/mapa",
    "/consultas",
    "/bosque",
    "/logros",
    "/amigos",
    "/comunidad",
    "/juegos",
  ];
  const runner = () => {
    allRoutes.forEach((path, idx) => {
      setTimeout(() => preloadRoute(path), 80 + idx * 60);
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runner, { timeout: 2000 });
  } else {
    setTimeout(runner, 600);
  }
}
