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
  "/discord": "Salas de Estudio",
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
  if (!sectionOrResource) {
    return `T.A.B.E. | Tu Asistente de Bolsillo Estudiantil`;
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
    const updateTitle = () => {
      if (currentResourceTitle) {
        document.title = formatDocumentTitle(currentResourceTitle);
        return;
      }

      if (location.pathname === "/") {
        document.title = "T.A.B.E. | Tu Asistente de Bolsillo Estudiantil";
        return;
      }

      const sectionTitle = getTitleForPath(location.pathname);
      document.title = formatDocumentTitle(sectionTitle);
    };

    updateTitle();

    listeners.add(updateTitle);
    return () => {
      listeners.delete(updateTitle);
    };
  }, [location.pathname]);

  return null;
}
