import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

interface SectionTheme {
  primaryRgb: string;
  secondaryRgb: string;
}

const SECTION_THEMES: Record<string, SectionTheme> = {
  "/dashboard": { primaryRgb: "59, 130, 246", secondaryRgb: "245, 158, 11" },        // Azul & Oro
  "/apuntes": { primaryRgb: "168, 85, 247", secondaryRgb: "59, 130, 246" },          // Violeta & Azul
  "/carrera": { primaryRgb: "16, 185, 129", secondaryRgb: "59, 130, 246" },         // Esmeralda & Azul
  "/carreras": { primaryRgb: "16, 185, 129", secondaryRgb: "59, 130, 246" },        // Esmeralda & Azul
  "/examenes": { primaryRgb: "244, 63, 94", secondaryRgb: "249, 115, 22" },         // Rojo Coral & Naranja
  "/calendario": { primaryRgb: "249, 115, 22", secondaryRgb: "234, 179, 8" },       // Naranja Solar & Ámbar
  "/pomodoro": { primaryRgb: "244, 63, 94", secondaryRgb: "168, 85, 247" },         // Rosa Rubí & Violeta
  "/tareas": { primaryRgb: "16, 185, 129", secondaryRgb: "20, 184, 166" },          // Verde Esmeralda & Turquesa
  "/rutinas": { primaryRgb: "14, 165, 233", secondaryRgb: "99, 102, 241" },         // Azul Cielo & Índigo
  "/metricas": { primaryRgb: "217, 70, 239", secondaryRgb: "6, 182, 212" },         // Fucsia & Cian
  "/flashcards": { primaryRgb: "168, 85, 247", secondaryRgb: "99, 102, 241" },      // Amatista & Índigo
  "/cuestionarios": { primaryRgb: "234, 179, 8", secondaryRgb: "249, 115, 22" },    // Ámbar Dorado & Naranja
  "/biblioteca": { primaryRgb: "139, 92, 246", secondaryRgb: "59, 130, 246" },      // Violeta & Azul
  "/consultas": { primaryRgb: "99, 102, 241", secondaryRgb: "14, 165, 233" },       // Índigo & Celeste
  "/mapa": { primaryRgb: "244, 63, 94", secondaryRgb: "168, 85, 247" },             // Rosa & Púrpura
  "/bosque": { primaryRgb: "34, 197, 94", secondaryRgb: "16, 185, 129" },           // Verde Bosque
  "/logros": { primaryRgb: "234, 179, 8", secondaryRgb: "245, 158, 11" },           // Oro Real
  "/amigos": { primaryRgb: "6, 182, 212", secondaryRgb: "59, 130, 246" },           // Cian & Azul
  "/comunidad": { primaryRgb: "20, 184, 166", secondaryRgb: "16, 185, 129" },       // Turquesa
  "/juegos": { primaryRgb: "249, 115, 22", secondaryRgb: "236, 72, 153" },          // Naranja Arcade & Rosa
  "/configuracion": { primaryRgb: "100, 116, 139", secondaryRgb: "99, 102, 241" },  // Pizarra & Índigo
  "/tabe-ai/examenes": { primaryRgb: "168, 85, 247", secondaryRgb: "59, 130, 246" },// Violeta & Azul Ruta IA
  "/tabeai": { primaryRgb: "139, 92, 246", secondaryRgb: "56, 189, 248" },          // Violeta & Cian IA
  "/tabe-ai": { primaryRgb: "139, 92, 246", secondaryRgb: "56, 189, 248" },         // Violeta & Cian IA
  "/tabetalk": { primaryRgb: "88, 101, 242", secondaryRgb: "35, 165, 89" },         // Índigo & Verde Voz
  "/tabe-admin": { primaryRgb: "234, 179, 8", secondaryRgb: "249, 115, 22" },       // Oro & Naranja Admin
  "/meet": { primaryRgb: "14, 165, 233", secondaryRgb: "99, 102, 241" },            // Celeste & Índigo
  "/guia-de-estudio": { primaryRgb: "168, 85, 247", secondaryRgb: "236, 72, 153" }, // Violeta & Rosa
};

function getThemeForPath(pathname: string): SectionTheme {
  const lower = pathname.toLowerCase();
  for (const [key, theme] of Object.entries(SECTION_THEMES)) {
    if (lower.startsWith(key)) {
      return theme;
    }
  }
  return SECTION_THEMES["/dashboard"];
}

const COLOR_BADGE_CLASSES = [
  "bg-amber-", "bg-emerald-", "bg-sky-", "bg-blue-", "bg-purple-",
  "bg-rose-", "bg-orange-", "bg-indigo-", "bg-teal-", "bg-cyan-",
  "bg-pink-", "bg-yellow-", "bg-green-", "bg-violet-", "bg-fuchsia-",
  "text-amber-", "text-emerald-", "text-sky-", "text-blue-", "text-purple-",
  "text-rose-", "text-orange-", "text-indigo-", "text-teal-", "text-cyan-",
];

function hasColorClass(el: HTMLElement): boolean {
  const cls = typeof el.className === "string" ? el.className : "";
  if (!cls) return false;
  return COLOR_BADGE_CLASSES.some((token) => cls.includes(token));
}

function orchestrateStageModules(root: HTMLElement) {
  // Seleccionamos los contenedores principales del apartado
  const pageContainer =
    root.querySelector<HTMLElement>(".tabe-page") ||
    root.querySelector<HTMLElement>(".tabe-map") ||
    root.querySelector<HTMLElement>("main") ||
    root.querySelector<HTMLElement>("[class*='max-w-']") ||
    (root.firstElementChild as HTMLElement | null);

  if (!pageContainer) return;

  const candidateSet = new Set<HTMLElement>();

  // 1. Hijos directos del contenedor de página (cabecera, barra de filtros, secciones principales)
  Array.from(pageContainer.children).forEach((child) => {
    if (child instanceof HTMLElement && !child.classList.contains("grid")) {
      candidateSet.add(child);
    }
  });

  // 2. Tarjetas Bento y módulos principales en grillas de todos los apartados
  const moduleSelectors = [
    ".neo-bento-card",
    ".tabe-page > .grid > div",
    ".tabe-page > div > .grid > div",
    "[class*='max-w-'] > .grid > div",
    "[class*='max-w-'] > div > .grid > div",
    "main > .grid > div",
    "main > div > .grid > div",
  ];

  moduleSelectors.forEach((sel) => {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      candidateSet.add(el);
    });
  });

  let idx = 0;
  let animatedCount = 0;
  candidateSet.forEach((el) => {
    if (el.dataset.stageAnimated === "1") return;
    // Ignorar esqueletos de carga o modales ocultos
    if (el.classList.contains("animate-pulse") || el.getAttribute("role") === "dialog") {
      return;
    }

    el.dataset.stageAnimated = "1";
    const boundedIdx = Math.min(idx, 5);
    el.style.setProperty("--module-idx", String(boundedIdx));
    el.classList.add("tabe-stage-module");

    // Orquestar el impacto de color solo en los primeros badges/iconos superficiales del módulo
    const innerElements = el.querySelectorAll<HTMLElement>("span, div");
    const maxScan = Math.min(innerElements.length, 16);
    for (let i = 0; i < maxScan; i++) {
      const inner = innerElements[i];
      if (inner.dataset.colorAnimated === "1") continue;
      if (inner.children.length <= 2 && hasColorClass(inner)) {
        inner.dataset.colorAnimated = "1";
        inner.style.setProperty("--module-idx", String(boundedIdx));
        inner.classList.add("tabe-color-impact-badge");
      }
    }

    idx++;
    animatedCount++;
  });

  return animatedCount > 0;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = getThemeForPath(location.pathname);
  const lowerPath = location.pathname.toLowerCase();
  const isFullScreenEditor =
    lowerPath.startsWith("/apuntes") ||
    lowerPath.startsWith("/notion") ||
    lowerPath.startsWith("/tabeai") ||
    (lowerPath.startsWith("/tabe-ai") && !lowerPath.startsWith("/tabe-ai/examenes")) ||
    lowerPath.startsWith("/asistente") ||
    lowerPath.startsWith("/tabetalk");

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Pasada inmediata sin esperar frames extra
    orchestrateStageModules(root);

    // Observador breve (máx 500ms) por si el apartado monta su estructura tras un micro-tick
    const observer = new MutationObserver(() => {
      if (containerRef.current) {
        orchestrateStageModules(containerRef.current);
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    const stopTimer = setTimeout(() => {
      observer.disconnect();
    }, 500);

    return () => {
      clearTimeout(stopTimer);
      observer.disconnect();
    };
  }, [location.pathname]);

  // Pulso táctil ultraligero de Acción de Botón (sin bloquear ni ocultar nodos del DOM)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest<HTMLElement>('button:not(:disabled), [role="button"]:not([aria-disabled="true"])');
      if (!btn) return;

      btn.classList.remove("tabe-btn-clicked");
      btn.classList.add("tabe-btn-clicked");
      setTimeout(() => {
        btn.classList.remove("tabe-btn-clicked");
      }, 240);
    };

    document.addEventListener("click", handleGlobalClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      key={location.pathname}
      style={
        {
          "--section-accent-rgb": theme.primaryRgb,
          "--section-secondary-rgb": theme.secondaryRgb,
        } as React.CSSProperties
      }
      className={cn("relative", className)}
    >
      {/* Halo ambiental de impacto de color del apartado (no bloquea clics ni molesta la vista) */}
      {!isFullScreenEditor && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden -z-10 select-none tabe-ambient-bloom"
        >
          <div
            className="mx-auto max-w-6xl h-full opacity-90 dark:opacity-100 transition-all duration-500"
            style={{
              background: `
                radial-gradient(ellipse 55% 70% at 25% 0%, rgba(${theme.primaryRgb}, 0.09), transparent 75%),
                radial-gradient(ellipse 45% 60% at 75% 0%, rgba(${theme.secondaryRgb}, 0.07), transparent 75%)
              `,
            }}
          />
        </div>
      )}

      {children}
    </div>
  );
}
