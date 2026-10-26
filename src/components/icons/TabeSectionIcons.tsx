import React from "react";
import { cn } from "@/lib/utils";

export interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * 1. Universidad / Académico (Category Icon)
 * Fachada universitaria institucional con frontón y columnas griegas estilizadas.
 */
export function UniversidadCatIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <polygon points="12 2 3 7 21 7 12 2" />
      <line x1="6" y1="10" x2="6" y2="18" />
      <line x1="10" y1="10" x2="10" y2="18" />
      <line x1="14" y1="10" x2="14" y2="18" />
      <line x1="18" y1="10" x2="18" y2="18" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <path d="M2 18h20" />
      <path d="M1 22h22" />
    </svg>
  );
}


/**
 * 1.b Estudio (Category Icon)
 * Cuaderno/libro de estudio abierto con destello de aprendizaje.
 */
export function EstudioCatIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      <path d="M12 4v4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * 2. Plan de Carrera (NUEVO DISEÑO PROPIO)
 * Brújula estelar y timón de trayectoria académica con horizonte de avance universitario.
 * Un puntero de rumbo sobre un compás con coordenadas de materias y futuro profesional.
 */
export function PlanCarreraIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Esfera exterior del plan */}
      <circle cx="12" cy="12" r="9.5" />
      {/* Puntero de orientación hacia la meta (estrella norte del título) */}
      <polygon points="12 4.5 14.5 11 19.5 12 14.5 13 12 19.5 9.5 13 4.5 12 9.5 11 12 4.5" fill="currentColor" fillOpacity="0.12" />
      {/* Eje central de decisiones */}
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      {/* Marcas cardinales de progreso de la carrera */}
      <line x1="12" y1="2" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/**
 * 3. Exámenes (NUEVO DISEÑO PROPIO)
 * Hoja de examen con sujetador superior y gran visto de aprobación impecable.
 * Representa la instancia clave de evaluación y su aprobación.
 */
export function ExamenesIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Hoja de examen cuadriculada */}
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      {/* Clip / sujetador superior de mesa de examen */}
      <path d="M9 3v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      {/* Líneas de enunciados */}
      <line x1="8" y1="8" x2="16" y2="8" strokeOpacity="0.7" />
      <line x1="8" y1="12" x2="13" y2="12" strokeOpacity="0.7" />
      {/* Gran check de aprobación y firma final */}
      <path d="M8 16.5l2.5 2.5 5.5-6" strokeWidth="2.4" />
    </svg>
  );
}

/**
 * 4. Biblioteca
 * Estantería estructurada con lomos de libros en perspectiva y un libro abierto central.
 */
export function BibliotecaCustomIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="6" y1="4" x2="6" y2="8" />
      <line x1="9" y1="4" x2="9" y2="8" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <line x1="17" y1="4" x2="15" y2="8" />
      <line x1="7" y1="10" x2="7" y2="14" />
      <line x1="10" y1="10" x2="10" y2="14" />
      <line x1="16" y1="10" x2="16" y2="14" />
      <line x1="8" y1="16" x2="8" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="15" y1="16" x2="15" y2="20" />
    </svg>
  );
}

/**
 * 5. Correlatividades (Grafo de Prerrequisitos)
 * Grafo dirigido de nodos interconectados (malla curricular de dependencias).
 */
export function CorrelatividadesCustomIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="13" cy="12" r="2.5" />
      <circle cx="20" cy="12" r="2.5" />
      <path d="M7.5 7.5L10.5 10.5" />
      <path d="M7.5 16.5L10.5 13.5" />
      <line x1="15.5" y1="12" x2="17.5" y2="12" />
    </svg>
  );
}

/**
 * 6. Productividad / Organización (Category Icon)
 * Reloj de enfoque con dial analógico minimalista.
 */
export function ProductividadCatIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * 7. Juegos & Recreación (Category Icon)
 * Mando ergonómico integrado con botones de juego y cruceta direccional.
 */
export function RecreacionCatIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <path d="M6 12h4m-2-2v4" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" />
      <circle cx="17.5" cy="13" r="1" fill="currentColor" />
      <path d="M6 18l-1.5 2.5" />
      <path d="M18 18l1.5 2.5" />
    </svg>
  );
}

/**
 * 8. Dashboard
 * Panel modular de control académico con tarjetas balanceadas.
 */
export function DashboardCustomIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/**
 * 9. Comunidad (NUEVO DISEÑO PROPIO)
 * Constelación de estudio colaborativo: red orbital con nodos de intercambio
 * de apuntes, flashcards y foros estudiantiles.
 */
export function ComunidadCustomIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Anillo de red colaborativa orbital */}
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      {/* Nodo Norte - Compartir */}
      <circle cx="12" cy="5" r="2.2" fill="currentColor" />
      {/* Nodo Suroeste - Recibir */}
      <circle cx="6" cy="16" r="2.2" fill="currentColor" />
      {/* Nodo Sureste - Aprender */}
      <circle cx="18" cy="16" r="2.2" fill="currentColor" />
      {/* Vínculos de sinergia entre pares */}
      <path d="M12 7.2v3.6" />
      <path d="M7.8 14.8l3 1.8" />
      <path d="M16.2 14.8l-3 1.8" />
      {/* Núcleo de comunidad */}
      <circle cx="12" cy="13.5" r="1.5" />
    </svg>
  );
}

/**
 * 10. Amigos (NUEVO DISEÑO PROPIO)
 * Dúo de compañeros de cursada con saludo de alianza de estudio (study-buddies).
 * Reemplaza el clásico Users repetido de todas las apps por dos perfiles conectados.
 */
export function AmigosCustomIcon({ className, size = 20, ...props }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Compañero 1 (Izquierda) */}
      <circle cx="8" cy="8" r="3" />
      <path d="M3 19a5 5 0 0 1 9.5-2" />
      
      {/* Compañero 2 (Derecha) */}
      <circle cx="16" cy="9" r="2.5" />
      <path d="M14 17a4.5 4.5 0 0 1 7 3" />
      
      {/* Vínculo de compañerismo en el medio */}
      <path d="M12 4l.8 1.5 1.7.2-1.2 1.2.3 1.7L12 7.8l-1.6.8.3-1.7-1.2-1.2 1.7-.2L12 4z" fill="currentColor" />
    </svg>
  );
}
