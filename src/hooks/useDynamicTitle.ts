import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const APP_NAME = "TABE";

// Mapeo exhaustivo de rutas a nombres de sección
export const ROUTE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/dashboard": "Dashboard",
  "/carrera": "Mi Carrera",
  "/calendario": "Calendario",
  "/pomodoro": "Pomodoro",
  "/tareas": "Tareas",
  "/metricas": "Métricas",
  "/TABEAI": "TABE AI",
  "/asistente": "TABE AI",
  "/flashcards": "Flashcards",
  "/cuestionarios": "Cuestionarios",
  "/marketplace": "Marketplace",
  "/biblioteca": "Biblioteca",
  "/logros": "Logros",
  "/apuntes": "Apuntes",
  "/notion": "Apuntes",
  "/examenes": "Exámenes",
  "/amigos": "Amigos",
  "/configuracion": "Configuración",
  "/settings": "Configuración",
  "/admin": "Administración",
  "/bosque": "Bosque",
  "/rutinas": "Rutinas",
  "/tabetalk": "Tabetalk - Salas de Estudio",
  "/discord": "Tabetalk - Salas de Estudio",
  "/mapa": "Mapa de Correlatividades",
  "/consultas": "Consultas",
  "/juegos": "Juegos",
  "/juegos/penales": "Penales",
  "/juegos/karts": "Carrera de Karts",
  "/juegos/batalla": "Batalla RPG",
  "/juegos/bomba": "Desactiva la Bomba",
  "/juegos/tateti": "Ta-Te-Ti",
  "/juegos/ajedrez": "Ajedrez",
  "/carreras": "Carreras",
  "/guia-de-estudio": "Guía de Estudio",
  "/registro": "Iniciar Sesión",
  "/auth": "Iniciar Sesión",
  "/restablecer-contrasena": "Restablecer Contraseña",
  "/acerca-de": "Acerca de",
  "/contacto": "Contacto",
  "/privacidad": "Privacidad",
  "/terminos": "Términos",
  "/email-verificado": "Email Verificado",
};

// Variable para rastrear el título del recurso activo (ej. apunte o materia)
let currentResourceTitle: string | null = null;
const listeners = new Set<() => void>();

export function setDynamicResourceTitle(title: string | null | undefined) {
  currentResourceTitle = title ? title.trim() : null;
  listeners.forEach((fn) => fn());
}

export function formatDocumentTitle(sectionOrResource?: string | null): string {
  if (!sectionOrResource || sectionOrResource === "Inicio") {
    return `TABE | Tu Asistente de Bolsillo Estudiantil`;
  }
  return `${sectionOrResource} | ${APP_NAME}`;
}

export function getTitleForPath(pathname: string): string {
  // Coincidencia exacta
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  // Rutas dinámicas de carreras (/carreras/:id)
  if (pathname.startsWith("/carreras/")) {
    const slug = pathname.replace("/carreras/", "");
    if (slug) {
      return slug
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Carrera";
  }

  // Rutas de juegos (/juegos/:id)
  if (pathname.startsWith("/juegos/")) {
    const slug = pathname.replace("/juegos/", "");
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  return "T.A.B.E.";
}

/**
 * Hook para establecer un título específico de recurso en un componente (ej. apunte o materia)
 */
export function usePageTitle(resourceTitle?: string | null) {
  useEffect(() => {
    if (resourceTitle && resourceTitle.trim()) {
      setDynamicResourceTitle(resourceTitle);
      document.title = formatDocumentTitle(resourceTitle);
    } else {
      setDynamicResourceTitle(null);
    }

    return () => {
      setDynamicResourceTitle(null);
    };
  }, [resourceTitle]);
}

/**
 * Componente centinela global que observa la ruta activa y actualiza document.title
 */
export function DynamicTitleWatcher() {
  const location = useLocation();

  useEffect(() => {
    const updateTitleAndMetadata = () => {
      // 1. Título del documento
      if (currentResourceTitle) {
        document.title = formatDocumentTitle(currentResourceTitle);
      } else if (location.pathname === "/") {
        document.title = "TABE | Tu Asistente de Bolsillo Estudiantil";
      } else {
        const sectionTitle = getTitleForPath(location.pathname);
        document.title = formatDocumentTitle(sectionTitle);
      }

      // 2. Canonical URL dinámica y metadatos sociales para el nuevo dominio tabe.com.ar
      const cleanPath = location.pathname === "/" ? "" : location.pathname;
      const canonicalUrl = `https://tabe.com.ar${cleanPath}`;

      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute("href", canonicalUrl);

      const ogUrlEl = document.querySelector('meta[property="og:url"]');
      if (ogUrlEl) {
        ogUrlEl.setAttribute("content", canonicalUrl);
      }

      const twitterUrlEl = document.querySelector('meta[name="twitter:url"]');
      if (twitterUrlEl) {
        twitterUrlEl.setAttribute("content", canonicalUrl);
      }
    };

    updateTitleAndMetadata();

    listeners.add(updateTitleAndMetadata);
    return () => {
      listeners.delete(updateTitleAndMetadata);
    };
  }, [location.pathname]);

  return null;
}
