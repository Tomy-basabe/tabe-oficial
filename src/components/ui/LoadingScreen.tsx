import React from "react";
import { cn } from "@/lib/utils";
import {
  DashboardSkeleton,
  CareerPlanSkeleton,
  CalendarSkeleton,
  OfficeHoursSkeleton,
  FlashcardsGridSkeleton,
  QuizzesGridSkeleton,
  ExamsSkeleton,
  RoutinesSkeleton,
  FriendsSkeleton,
  PomodoroSkeleton,
  AchievementsSkeleton,
  ForestSkeleton,
  CorrelativityMapSkeleton,
  AIAssistantSkeleton,
  LibrarySkeleton,
  MarketplaceSkeleton,
  GenericPageSkeleton,
} from "@/components/ui/AppSkeletons";

export interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  className?: string;
  type?:
    | "dashboard"
    | "career"
    | "calendar"
    | "office_hours"
    | "flashcards"
    | "quizzes"
    | "exams"
    | "routines"
    | "friends"
    | "pomodoro"
    | "achievements"
    | "forest"
    | "correlativity_map"
    | "ai_assistant"
    | "library"
    | "marketplace"
    | "generic";
  delayMs?: number;
}

/**
 * Pantalla de carga por Esqueletos Oficial de TABE:
 * Cada apartado cuenta con su esqueleto a medida que replica exactamente la silueta real del contenido.
 */
export function LoadingScreen({
  message = "Cargando...",
  submessage,
  fullScreen = false,
  className = "",
  type,
}: LoadingScreenProps) {
  // Detección automática del tipo de esqueleto a partir de los props o del mensaje
  const detectedType = React.useMemo(() => {
    if (type) return type;
    const msg = (message || "").toLowerCase();
    if (msg.includes("dash") || msg.includes("progreso")) return "dashboard";
    if (msg.includes("pomodoro") || msg.includes("temporizador") || msg.includes("concentra")) return "pomodoro";
    if (msg.includes("logro") || msg.includes("insignia") || msg.includes("rango")) return "achievements";
    if (msg.includes("bosque") || msg.includes("forest") || msg.includes("árbol") || msg.includes("arbol")) return "forest";
    if (msg.includes("mapa") || msg.includes("grafo")) return "correlativity_map";
    if (msg.includes("asistente") || msg.includes("ia") || msg.includes("inteligencia") || msg.includes("chat")) return "ai_assistant";
    if (msg.includes("biblioteca") || msg.includes("archivo") || msg.includes("material")) return "library";
    if (msg.includes("comunidad") || msg.includes("market") || msg.includes("compartid")) return "marketplace";
    if (msg.includes("plan") || msg.includes("carrera") || msg.includes("correlativ")) return "career";
    if (msg.includes("calen") || msg.includes("evento")) return "calendar";
    if (msg.includes("consul") || msg.includes("docente") || msg.includes("profe")) return "office_hours";
    if (msg.includes("flash") || msg.includes("tarjeta") || msg.includes("mazo")) return "flashcards";
    if (msg.includes("cuestion") || msg.includes("quiz") || msg.includes("trivia")) return "quizzes";
    if (msg.includes("exam") || msg.includes("evalua")) return "exams";
    if (msg.includes("rutin") || msg.includes("horario") || msg.includes("bloque")) return "routines";
    if (msg.includes("amig") || msg.includes("compañer")) return "friends";
    return "generic";
  }, [type, message]);

  const renderSkeleton = () => {
    switch (detectedType) {
      case "dashboard":
        return <DashboardSkeleton />;
      case "career":
        return <CareerPlanSkeleton />;
      case "calendar":
        return <CalendarSkeleton />;
      case "office_hours":
        return <OfficeHoursSkeleton />;
      case "flashcards":
        return <FlashcardsGridSkeleton />;
      case "quizzes":
        return <QuizzesGridSkeleton />;
      case "exams":
        return <ExamsSkeleton />;
      case "routines":
        return <RoutinesSkeleton />;
      case "friends":
        return <FriendsSkeleton />;
      case "pomodoro":
        return <PomodoroSkeleton />;
      case "achievements":
        return <AchievementsSkeleton />;
      case "forest":
        return <ForestSkeleton />;
      case "correlativity_map":
        return <CorrelativityMapSkeleton />;
      case "ai_assistant":
        return <AIAssistantSkeleton />;
      case "library":
        return <LibrarySkeleton />;
      case "marketplace":
        return <MarketplaceSkeleton />;
      case "generic":
      default:
        return <GenericPageSkeleton />;
    }
  };

  return (
    <div
      className={cn(
        "w-full transition-opacity duration-200 select-none animate-in fade-in-0 duration-150",
        fullScreen ? "min-h-screen" : "min-h-[50vh]",
        className
      )}
    >
      {renderSkeleton()}
    </div>
  );
}

export default LoadingScreen;
