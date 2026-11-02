import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, Compass, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const TUTORIALS_STORAGE_KEY = "tabe-tutorials-completed";
export const TUTORIALS_COOKIE_KEY = "tabe_tutorials_completed";
export const TUTORIAL_RESTART_EVENT = "tabe:restart-tour";

export interface ActionItem {
  name: string;
  desc: string;
}

export interface TourStep {
  title: string;
  description: string;
  selectors: string[];
  actions?: ActionItem[];
}

export interface SectionTour {
  route: string;
  name: string;
  steps: TourStep[];
}

// Normalizador de rutas equivalentes
export function getCanonicalRoute(path: string): string {
  const p = path.toLowerCase();
  if (p === "/" || p.startsWith("/dashboard")) return "/dashboard";
  if (p.startsWith("/apuntes") || p.startsWith("/notion")) return "/apuntes";
  if (p.startsWith("/tabe-ai/examenes") || p.startsWith("/tabeai/examenes") || p.startsWith("/asistente/examenes")) {
    return "/tabe-ai/examenes";
  }
  if (p.startsWith("/tabeai") || p.startsWith("/tabe-ai") || p.startsWith("/asistente")) return "/TABEAI";
  if (p.startsWith("/tabetalk") || p.startsWith("/discord")) return "/tabetalk";
  if (p.startsWith("/marketplace") || p.startsWith("/comunidad")) return "/comunidad";
  if (p.startsWith("/mi-campus") || p.startsWith("/campus")) return "/campus";
  if (p.startsWith("/settings") || p.startsWith("/configuracion")) return "/configuracion";
  if (p.startsWith("/metricas") || p.startsWith("/metrics")) return "/metricas";
  if (p.startsWith("/juegos")) return "/juegos";
  return path;
}

// Lector Multi-Tier de tutoriales completados
export function getCompletedTutorials(user?: any): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  if (user?.user_metadata?.tabe_tutorials_completed) {
    try {
      const cloud = user.user_metadata.tabe_tutorials_completed;
      if (typeof cloud === "object" && cloud !== null) {
        Object.assign(result, cloud);
      }
    } catch {}
  }

  if (typeof window === "undefined") return result;

  try {
    const raw = localStorage.getItem(TUTORIALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.assign(result, parsed);
      }
    }
  } catch {}

  if (user?.id) {
    try {
      const rawUser = localStorage.getItem(`${TUTORIALS_STORAGE_KEY}-${user.id}`);
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (typeof parsedUser === "object" && parsedUser !== null) {
          Object.assign(result, parsedUser);
        }
      }
    } catch {}
  }

  if (typeof document !== "undefined") {
    try {
      const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + TUTORIALS_COOKIE_KEY + "=([^;]*)"));
      if (match) {
        const parsedCookie = JSON.parse(decodeURIComponent(match[1]));
        if (typeof parsedCookie === "object" && parsedCookie !== null) {
          Object.assign(result, parsedCookie);
        }
      }
    } catch {}
  }

  return result;
}

// Guardar tutorial completado
export function saveTutorialCompleted(route: string, user?: any) {
  if (typeof window === "undefined") return;

  const canonical = getCanonicalRoute(route);
  const current = getCompletedTutorials(user);
  current[canonical] = true;
  current[route] = true;

  if (canonical === "/apuntes") current["/notion"] = true;
  if (canonical === "/tabetalk") current["/discord"] = true;
  if (canonical === "/comunidad") current["/marketplace"] = true;

  const serialized = JSON.stringify(current);

  try {
    localStorage.setItem(TUTORIALS_STORAGE_KEY, serialized);
    if (user?.id) {
      localStorage.setItem(`${TUTORIALS_STORAGE_KEY}-${user.id}`, serialized);
    }
  } catch {}

  try {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${TUTORIALS_COOKIE_KEY}=${encodeURIComponent(serialized)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  } catch {}

  if (user && !user.isGuest && user.id) {
    try {
      supabase.auth
        .updateUser({
          data: { tabe_tutorials_completed: current },
        })
        .catch(() => {});
    } catch {}
  }
}

// Reiniciar todos los tutoriales
export async function resetAllTutorials(user?: any) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(TUTORIALS_STORAGE_KEY);
    if (user?.id) {
      localStorage.removeItem(`${TUTORIALS_STORAGE_KEY}-${user.id}`);
    }
    document.cookie = `${TUTORIALS_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {}

  if (user && !user.isGuest && user.id) {
    try {
      await supabase.auth.updateUser({
        data: { tabe_tutorials_completed: {} },
      });
    } catch {}
  }
}

// ============================================================================
// DICCIONARIO LIMPIO Y CONCISO DE APARTADOS (AL GRANO)
// ============================================================================
export const TOURS_BY_ROUTE: Record<string, SectionTour> = {
  "/dashboard": {
    route: "/dashboard",
    name: "Dashboard",
    steps: [
      {
        title: "Tu resumen académico",
        description: "Visualiza de un vistazo tu avance de carrera, racha de estudio y experiencia ganada (XP).",
        selectors: [".tour-dashboard-header", ".neo-bento-card:first-of-type"],
        actions: [
          { name: "XP Total", desc: "Toca la insignia de XP para ver tus métricas completas de estudio." },
        ],
      },
      {
        title: "Estado de cursada",
        description: "Contabiliza materias aprobadas, asignaturas regulares y total de horas estudiadas este mes.",
        selectors: [".tour-dashboard-stats"],
      },
      {
        title: "Avance y materias recientes",
        description: "Sigue el porcentaje total completado de tu plan y accede rápidamente a tus últimas asignaturas.",
        selectors: [".tour-dashboard-progress", ".tour-dashboard-subjects"],
        actions: [
          { name: "Ver todo", desc: "Abre el Plan de Carrera completo para editar notas o correlativas." },
        ],
      },
      {
        title: "Agenda y hábitos diarios",
        description: "Controla tu objetivo de Pomodoro, mantén tu racha de días activos y revisa tus exámenes próximos.",
        selectors: [".tour-dashboard-schedule", ".lg\\:col-span-4"],
      },
    ],
  },
  "/metricas": {
    route: "/metricas",
    name: "Métricas y Rendimiento",
    steps: [
      {
        title: "Control de rendimiento",
        description: "Analiza tu tiempo invertido, hábitos de estudio y avance por materia a lo largo del calendario.",
        selectors: [".tour-metrics-header", ".tabe-page > div:first-child"],
        actions: [
          { name: "Filtrar Fechas", desc: "Alterna entre esta semana, este mes o períodos personalizados con las flechas." },
          { name: "Cargar Tiempo", desc: "Registra horas dedicadas fuera de la app (lectura física, clases o laboratorios)." },
        ],
      },
      {
        title: "Estadísticas globales",
        description: "Monitorea tus horas totales de estudio, bloques de Pomodoro, materias con actividad y sesiones de repaso.",
        selectors: [".tour-metrics-overview", ".grid.grid-cols-2.lg\\:grid-cols-4"],
      },
      {
        title: "Distribución y materias",
        description: "Visualiza la intensidad diaria de estudio. Toca cualquier columna del gráfico para auditar o ajustar las horas de ese día.",
        selectors: [".tour-metrics-chart", ".grid.lg\\:grid-cols-3"],
        actions: [
          { name: "Por Materia", desc: "Descubre qué porcentaje de tu tiempo total le dedicas a cada cátedra." },
          { name: "Ajustar Tiempo", desc: "Elimina o modifica sesiones cargadas por error en una fecha puntual." },
        ],
      },
      {
        title: "Vistas especializadas",
        description: "Accede al Predictor de Graduación de tu carrera, retención de Flashcards, cumplimiento de Rutinas y métricas de Descanso.",
        selectors: [".tour-metrics-tabs"],
        actions: [
          { name: "Carrera & Predicción", desc: "Calcula en qué fecha estimada terminarás de cursar según tu ritmo actual." },
          { name: "Descanso y Rutinas", desc: "Supervisa tus horas de sueño y consistencia de hábitos para evitar el agotamiento." },
        ],
      },
    ],
  },
  "/carrera": {
    route: "/carrera",
    name: "Plan de Carrera",
    steps: [
      {
        title: "Gestión de materias",
        description: "Administra tu plan de estudios oficial, programa de materias y correlatividades necesarias.",
        selectors: [".tabe-page > div:first-child", ".tour-career-add"],
        actions: [
          { name: "Agregar Materia", desc: "Carga una materia con su código, año y requisitos correlativos." },
          { name: "Importar Plan", desc: "Importa el plan oficial de tu facultad o genéralo con IA desde un PDF." },
          { name: "Ver Mapa", desc: "Abre el grafo visual para ver qué materias destraban a otras." },
        ],
      },
      {
        title: "Promedio y estados",
        description: "Calcula automáticamente tu promedio y clasifica tus materias en Aprobadas, Regulares y Cursables.",
        selectors: [".tabe-page > div:nth-child(2)"],
      },
      {
        title: "Tarjetas de materia",
        description: "Toca el estado de cualquier materia para cambiar su condición, registrar notas parciales o ver el programa.",
        selectors: [".tabe-page > div:nth-child(4)", ".tabe-page"],
      },
    ],
  },
  "/TABEAI": {
    route: "/TABEAI",
    name: "TABE IA",
    steps: [
      {
        title: "Tutor inteligente",
        description: "Resuelve dudas académicas, resume apuntes, transcribe clases grabadas y crea material de estudio.",
        selectors: ["header", ".flex-1 > header"],
        actions: [
          { name: "Historial", desc: "Accede a conversaciones anteriores o cambia la personalidad del tutor." },
          { name: "Exámenes / Voz", desc: "Alterna entre el generador de rutas temáticas y la llamada de voz en vivo." },
        ],
      },
      {
        title: "Herramientas de consulta",
        description: "Escribe tu duda, adjunta archivos de cátedra (PDF, fotos de pizarrón) o activa búsqueda web.",
        selectors: ["textarea", "form", ".max-w-3xl"],
        actions: [
          { name: "Adjuntar", desc: "Sube PDFs, fotos de apuntes o audios para analizarlos al instante." },
          { name: "Acciones directas", desc: "Pídele que cree flashcards, cuestionarios o agende exámenes automáticamente." },
        ],
      },
    ],
  },
  "/tabe-ai/examenes": {
    route: "/tabe-ai/examenes",
    name: "Rutas de Examen",
    steps: [
      {
        title: "Árbol de estudio gamificado",
        description: "Convierte el programa de tu examen en un camino por niveles interactivos con teoría y autoevaluación.",
        selectors: [".tabe-page > div:first-child", "header"],
        actions: [
          { name: "Nueva Ruta", desc: "Pega tus temas o sube el temario para armar el mapa de estudio." },
        ],
      },
    ],
  },
  "/apuntes": {
    route: "/apuntes",
    name: "Apuntes Online",
    steps: [
      {
        title: "Cuaderno enriquecido",
        description: "Escribe resúmenes con formato Notion, ecuaciones matemáticas LaTeX y diagramas.",
        selectors: [".tour-notion-create", ".tabe-page > div:first-child"],
        actions: [
          { name: "+ Nueva Página", desc: "Crea una página en blanco o elige una plantilla académica." },
          { name: "Importar de Amigos", desc: "Explora y copia apuntes compartidos por tus compañeros." },
        ],
      },
      {
        title: "Organización y filtros",
        description: "Filtra tus documentos por año de cursada y materia para tener tus materias ordenadas.",
        selectors: [".tabe-page > div:first-child > div:nth-child(2)", ".tabe-page > div:first-child"],
      },
      {
        title: "Superpoderes dentro del apunte",
        description: "Usa '/' para insertar bloques, selecciona texto para consultar a la IA o activa el Audiolibro.",
        selectors: [".tour-notion-list", ".tabe-page"],
      },
    ],
  },
  "/flashcards": {
    route: "/flashcards",
    name: "Flashcards",
    steps: [
      {
        title: "Mazos de memoria activa",
        description: "Memoriza definiciones y fórmulas mediante repetición espaciada organizada por materias.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Nuevo Mazo", desc: "Crea tarjetas manuales o deja que la IA las genere por ti." },
        ],
      },
      {
        title: "Modo Repaso",
        description: "Toca un mazo y selecciona 'Estudiar' para poner a prueba tu retención antes de rendir.",
        selectors: [".tour-flashcards-decks"],
      },
    ],
  },
  "/cuestionarios": {
    route: "/cuestionarios",
    name: "Cuestionarios",
    steps: [
      {
        title: "Simulacros de examen",
        description: "Practica con preguntas de opción múltiple con corrección instantánea y explicaciones.",
        selectors: [".tabe-page > div:first-child", ".tour-quizzes-decks"],
        actions: [
          { name: "+ Nuevo Cuestionario", desc: "Crea un banco de preguntas o pídelo a la IA desde un apunte." },
        ],
      },
    ],
  },
  "/biblioteca": {
    route: "/biblioteca",
    name: "Biblioteca",
    steps: [
      {
        title: "Archivos en la nube",
        description: "Guarda libros, PDFs, guías de ejercicios y documentos ordenados por materia y carpeta.",
        selectors: [".tabe-page > div:first-child", ".tour-library-upload"],
        actions: [
          { name: "Subir Archivo", desc: "Sube documentos y léelos con el visor integrado sin distracciones." },
        ],
      },
    ],
  },
  "/calendario": {
    route: "/calendario",
    name: "Calendario",
    steps: [
      {
        title: "Agenda académica",
        description: "Sincroniza tus exámenes, parciales y entregas en tiempo real con Google Calendar y Moodle.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "Sincronizar", desc: "Conecta Google Calendar o Moodle para importar tus fechas clave." },
          { name: "+ Nuevo Evento", desc: "Agenda un parcial, entrega de TP o clase con hora y color." },
        ],
      },
      {
        title: "Mes y filtros",
        description: "Navega entre meses o filtra por año de carrera para ver solo las materias que te interesan.",
        selectors: [".neo-bento-card > div:first-child", ".lg\\:col-span-3"],
      },
    ],
  },
  "/pomodoro": {
    route: "/pomodoro",
    name: "Pomodoro",
    steps: [
      {
        title: "Enfoque por materia",
        description: "Estudia en bloques de concentración, asocia cada sesión a una materia y gana XP.",
        selectors: [".tabe-page > div:first-child", ".lg\\:col-span-2"],
        actions: [
          { name: "Ventana Flotante (PiP)", desc: "Mantén el reloj siempre visible mientras lees apuntes o PDFs." },
          { name: "Ajustes", desc: "Modifica la duración de los bloques de estudio y pausas." },
        ],
      },
    ],
  },
  "/tareas": {
    route: "/tareas",
    name: "Tareas",
    steps: [
      {
        title: "Tablero de pendientes",
        description: "Organiza entregas y trabajos prácticos en columnas Por Hacer, En Progreso y Completado.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Nueva Tarea", desc: "Crea una tarea con materia, fecha límite y nivel de prioridad." },
        ],
      },
    ],
  },
  "/rutinas": {
    route: "/rutinas",
    name: "Rutinas",
    steps: [
      {
        title: "Horario semanal",
        description: "Planifica tus horas fijas de cursada, bloques de repaso y hábitos para mantener tu racha.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Nueva Rutina", desc: "Registra cursadas y horarios recurrentes de lunes a domingo." },
        ],
      },
    ],
  },
  "/examenes": {
    route: "/examenes",
    name: "Exámenes",
    steps: [
      {
        title: "Fechas de evaluación",
        description: "Controla cuántos días faltan para cada parcial o final y gestiona el estudio en formato Lista o Kanban.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Agendar Examen", desc: "Registra fecha, aula y tipo de examen (P1, P2, Final)." },
          { name: "Rutas con IA", desc: "Genera el plan de estudio temático para llegar preparado." },
        ],
      },
    ],
  },
  "/consultas": {
    route: "/consultas",
    name: "Consultas",
    steps: [
      {
        title: "Horarios docentes",
        description: "Registra a tus profesores y ten siempre a mano los días, aulas o enlaces de consulta de cada cátedra.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Agregar Consulta", desc: "Guarda el nombre del profesor, materia y su horario semanal." },
        ],
      },
    ],
  },
  "/mapa": {
    route: "/mapa",
    name: "Correlatividades",
    steps: [
      {
        title: "Red de correlativas",
        description: "Explora tu carrera en un grafo interactivo: identifica de inmediato qué materias destraban a otras.",
        selectors: [".tabe-map header", "header", ".tabe-map"],
      },
    ],
  },
  "/campus": {
    route: "/campus",
    name: "Mi Campus",
    steps: [
      {
        title: "Portales universitarios",
        description: "Accede a tu Campus Moodle, SIU Guaraní o autogestión de facultad sin salir de TABE.",
        selectors: [".tabe-page > div:first-child", "header"],
      },
    ],
  },
  "/bosque": {
    route: "/bosque",
    name: "Mi Bosque",
    steps: [
      {
        title: "Ecosistema de estudio",
        description: "Cada bloque de Pomodoro completado planta un árbol en tu isla viva según el tiempo estudiado.",
        selectors: [".tour-forest-tree", ".tabe-page > div:first-child", "main"],
      },
    ],
  },
  "/juegos": {
    route: "/juegos",
    name: "Juegos",
    steps: [
      {
        title: "Arcade académico",
        description: "Compite 1 vs 1 con amigos o practica en solitario respondiendo preguntas de tu carrera para sumar XP.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "Unirse con código", desc: "Ingresa a la sala multijugador privada creada por un compañero." },
        ],
      },
    ],
  },
  "/logros": {
    route: "/logros",
    name: "Logros",
    steps: [
      {
        title: "Prestigio académico",
        description: "Desbloquea medallas al aprobar materias, sumar horas de estudio y mantener rachas activas.",
        selectors: [".tabe-page > div:first-child", ".tour-achievements-list"],
      },
    ],
  },
  "/amigos": {
    route: "/amigos",
    name: "Amigos",
    steps: [
      {
        title: "Comunidad y ranking",
        description: "Conecta con compañeros por su ID de usuario, comparte apuntes directos por chat y compite en el podio semanal.",
        selectors: [".tabe-page > div:first-child"],
        actions: [
          { name: "+ Agregar Amigo", desc: "Busca a un compañero por su nombre de usuario o ID numérico." },
        ],
      },
    ],
  },
  "/comunidad": {
    route: "/comunidad",
    name: "Comunidad",
    steps: [
      {
        title: "Recursos colaborativos",
        description: "Descarga o comparte apuntes, flashcards y cuestionarios creados por estudiantes de tu misma carrera.",
        selectors: [".tabe-page > div:first-child", ".tour-marketplace-decks"],
        actions: [
          { name: "Publicar", desc: "Comparte tus resúmenes o mazos para ayudar a otros estudiantes." },
        ],
      },
    ],
  },
  "/configuracion": {
    route: "/configuracion",
    name: "Configuración",
    steps: [
      {
        title: "Perfil e integraciones",
        description: "Personaliza tu facultad, vincula Google Calendar/Moodle, configura los bots de WhatsApp o reinicia tutoriales.",
        selectors: ["aside nav", ".tabe-page aside", ".tabe-page main"],
      },
    ],
  },
};

function findTargetElement(selectors: string[]): HTMLElement | null {
  if (typeof document === "undefined") return null;

  for (const sel of selectors) {
    try {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          return el;
        }
      }
    } catch {}
  }

  const fallback = document.querySelector<HTMLElement>(".tabe-page > div:first-child, main > div:first-child");
  if (fallback) {
    const r = fallback.getBoundingClientRect();
    if (r.width > 20 && r.height > 20) return fallback;
  }
  return null;
}

// ============================================================================
// COMPONENTE VISUAL PRINCIPAL (ESTILO NOTION / APPLE / LINEAR)
// ============================================================================
export function TutorialTour() {
  const { user, isGuest } = useAuth();
  const location = useLocation();

  const [activeTour, setActiveTour] = useState<SectionTour | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const activeRouteRef = useRef(location.pathname);
  activeRouteRef.current = location.pathname;

  const currentStep = useMemo(() => {
    if (!activeTour) return null;
    return activeTour.steps[stepIdx] || null;
  }, [activeTour, stepIdx]);

  // Medir posición del elemento sin alterar su escala
  const measureTarget = useCallback((scroll = false) => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const el = findTargetElement(currentStep.selectors);
    if (!el) {
      setTargetRect(null);
      return;
    }

    if (scroll) {
      try {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top < 80 || rect.bottom > vh - 80) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      } catch {}
    }

    requestAnimationFrame(() => {
      setTargetRect(el.getBoundingClientRect());
    });
  }, [currentStep]);

  const startTour = useCallback(
    (targetPath?: string, force = false) => {
      const path = targetPath || location.pathname;
      const canonical = getCanonicalRoute(path);

      if (!force && document.querySelector('[role="dialog"]')) {
        return;
      }

      const completed = getCompletedTutorials(user);
      if (!force && (completed[canonical] || completed[path])) {
        setActiveTour(null);
        return;
      }

      const tour = TOURS_BY_ROUTE[canonical] || TOURS_BY_ROUTE[path.toLowerCase()];
      if (!tour || tour.steps.length === 0) {
        setActiveTour(null);
        return;
      }

      setActiveTour(tour);
      setStepIdx(0);
    },
    [location.pathname, user]
  );

  // Auto-inicio la primera vez que se visita el apartado
  useEffect(() => {
    if (!user && !isGuest) return;

    setActiveTour(null);
    const timer = setTimeout(() => {
      startTour(location.pathname, false);
    }, 900);

    return () => clearTimeout(timer);
  }, [user, isGuest, location.pathname, startTour]);

  // Escuchar evento para reiniciar tour a petición del usuario
  useEffect(() => {
    const handleTrigger = (e: any) => {
      const route = e?.detail?.route || location.pathname;
      const canonical = getCanonicalRoute(route);
      startTour(canonical, true);
    };

    window.addEventListener(TUTORIAL_RESTART_EVENT, handleTrigger);
    return () => window.removeEventListener(TUTORIAL_RESTART_EVENT, handleTrigger);
  }, [location.pathname, startTour]);

  // Actualizar medidas en resize, scroll o cambio de paso
  useEffect(() => {
    if (!activeTour) return;
    measureTarget(true);
    const t = setTimeout(() => measureTarget(false), 200);

    const onUpdate = () => measureTarget(false);
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [activeTour, stepIdx, measureTarget]);

  const handleClose = useCallback(() => {
    const routeToMark = activeTour?.route || activeRouteRef.current;
    setActiveTour(null);
    saveTutorialCompleted(routeToMark, user);
  }, [activeTour, user]);

  const handleNext = useCallback(() => {
    if (!activeTour) return;
    if (stepIdx < activeTour.steps.length - 1) {
      setStepIdx((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [activeTour, stepIdx, handleClose]);

  const handlePrev = useCallback(() => {
    if (stepIdx > 0) {
      setStepIdx((prev) => prev - 1);
    }
  }, [stepIdx]);

  // Atajos de teclado: Escape, Flecha Derecha, Flecha Izquierda
  useEffect(() => {
    if (!activeTour) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, handleClose, handleNext, handlePrev]);

  // Posicionamiento inteligente del Tooltip (cerca del elemento sin taparlo)
  const tooltipStyle = useMemo((): React.CSSProperties => {
    if (typeof window === "undefined") return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;

    if (isMobile) {
      // En móvil, se ubica cómodamente arriba o abajo según dónde esté el elemento
      if (targetRect && targetRect.top > vh * 0.45) {
        return {
          position: "fixed",
          top: "16px",
          left: "14px",
          right: "14px",
          maxWidth: "calc(100vw - 28px)",
        };
      }
      return {
        position: "fixed",
        bottom: "16px",
        left: "14px",
        right: "14px",
        maxWidth: "calc(100vw - 28px)",
      };
    }

    const cardWidth = 380;
    if (!targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${cardWidth}px`,
      };
    }

    const margin = 16;
    const estimatedHeight = currentStep?.actions?.length ? 260 : 190;
    const spaceBelow = vh - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let top = targetRect.bottom + margin;
    if (spaceBelow < estimatedHeight + 20 && spaceAbove > spaceBelow) {
      top = Math.max(16, targetRect.top - estimatedHeight - margin);
    } else if (top + estimatedHeight > vh - 16) {
      top = Math.max(16, vh - estimatedHeight - 16);
    }

    const centerTarget = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    const left = Math.max(16, Math.min(vw - cardWidth - 16, centerTarget));

    return {
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${cardWidth}px`,
    };
  }, [targetRect, currentStep]);

  if (!activeTour || !currentStep) return null;

  // Recorte sutil del Spotlight (sin deformaciones ni zoom)
  const pad = 6;
  const spotX = targetRect ? Math.max(2, targetRect.left - pad) : 0;
  const spotY = targetRect ? Math.max(2, targetRect.top - pad) : 0;
  const spotW = targetRect ? Math.min(window.innerWidth - 4, targetRect.width + pad * 2) : 0;
  const spotH = targetRect ? Math.min(window.innerHeight - 4, targetRect.height + pad * 2) : 0;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none select-none">
      {/* Cortina oscura suave con cutout transparente exacto */}
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={handleClose}
      >
        <defs>
          <mask id="tabe-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.45)"
          mask="url(#tabe-tour-mask)"
        />
      </motion.svg>

      {/* Borde perimetral fino y sutil sobre el elemento enfocado */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            left: `${spotX}px`,
            top: `${spotY}px`,
            width: `${spotW}px`,
            height: `${spotH}px`,
          }}
          className="rounded-xl ring-2 ring-zinc-900/40 dark:ring-white/40 pointer-events-none transition-all duration-150"
        />
      )}

      {/* Tarjeta Flotante Minimalista estilo Notion / Apple / Linear */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTour.route}-${stepIdx}`}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={tooltipStyle}
          className="z-[10005] pointer-events-auto bg-white dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
        >
          {/* Header: Badge sutil + Contador + Botón cerrar */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                <Compass className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{activeTour.name}</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                {stepIdx + 1} de {activeTour.steps.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              title="Cerrar tutorial (Esc)"
              className="w-6 h-6 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Título y descripción concisa (al grano) */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {currentStep.title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {currentStep.description}
            </p>
          </div>

          {/* Acciones o botones clave resumidos */}
          {currentStep.actions && currentStep.actions.length > 0 && (
            <div className="space-y-1 pt-1">
              {currentStep.actions.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/70"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
                    • {act.name}:
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 leading-snug">
                    {act.desc}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer de navegación */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 py-1 transition-colors cursor-pointer"
            >
              Saltar
            </button>

            <div className="flex items-center gap-1.5">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {stepIdx === activeTour.steps.length - 1 ? "Entendido" : "Siguiente"}
                </span>
                {stepIdx === activeTour.steps.length - 1 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
