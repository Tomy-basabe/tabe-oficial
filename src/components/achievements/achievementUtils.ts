import { Trophy, GraduationCap, Star, Clock, BookOpen, Flame, Layers, Compass, FilePlus, Library, Lock, Target, Users, MessageCircle, FolderOpen, Sprout, Brain, Calendar, Gamepad2, Swords, ShoppingBag, Award, Mic, Flag, Crown, CheckCircle2, LucideIcon } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";

export const achievementIconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  star: Star,
  clock: Clock,
  "book-open": BookOpen,
  flame: Flame,
  layers: Layers,
  compass: Compass,
  "file-plus": FilePlus,
  library: Library,
  target: Target,
  users: Users,
  "message-circle": MessageCircle,
  folder: FolderOpen,
  sprout: Sprout,
  brain: Brain,
  calendar: Calendar,
  "gamepad-2": Gamepad2,
  swords: Swords,
  "shopping-bag": ShoppingBag,
  award: Award,
  mic: Mic,
  flag: Flag,
  crown: Crown,
};

export interface CategoryTheme {
  label: string;
  description: string;
  badgeClass: string;
  iconBgClass: string;
  iconColorClass: string;
  borderClass: string;
  accentClass: string;
  dotColor: string;
}

export const categoryThemes: Record<string, CategoryTheme> = {
  academico: {
    label: "Académicos",
    description: "Materias aprobadas, parciales y rendimiento",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    iconBgClass: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconColorClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/20",
    accentClass: "bg-emerald-500",
    dotColor: "bg-emerald-500",
  },
  estudio: {
    label: "Estudio",
    description: "Horas de foco, flashcards y métodos de repaso",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    iconBgClass: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
    iconColorClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/20",
    accentClass: "bg-blue-500",
    dotColor: "bg-blue-500",
  },
  uso: {
    label: "Plataforma",
    description: "Organización de apuntes, biblioteca y hábitos",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    iconBgClass: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
    iconColorClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    accentClass: "bg-amber-500",
    dotColor: "bg-amber-500",
  },
  juegos: {
    label: "Desafíos",
    description: "Minijuegos, retos y recompensas lúdicas",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    iconBgClass: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400",
    iconColorClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-500/20",
    accentClass: "bg-purple-500",
    dotColor: "bg-purple-500",
  },
};

export interface RankInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  badge: string;
}

export const RANKS: RankInfo[] = [
  { level: 1, title: "Iniciante", minXP: 0, maxXP: 250, badge: "Novato" },
  { level: 2, title: "Aprendiz Constante", minXP: 250, maxXP: 600, badge: "Aprendiz" },
  { level: 3, title: "Estudiante Enfocado", minXP: 600, maxXP: 1200, badge: "Enfocado" },
  { level: 4, title: "Investigador Dedicado", minXP: 1200, maxXP: 2200, badge: "Investigador" },
  { level: 5, title: "Académico Destacado", minXP: 2200, maxXP: 3800, badge: "Destacado" },
  { level: 6, title: "Erudito Imparable", minXP: 3800, maxXP: 6000, badge: "Erudito" },
  { level: 7, title: "Maestro del Conocimiento", minXP: 6000, maxXP: 9500, badge: "Maestro" },
  { level: 8, title: "Leyenda Universitaria", minXP: 9500, maxXP: 999999, badge: "Leyenda" },
];

export function calculateUserRank(totalXP: number) {
  const currentRank = RANKS.slice().reverse().find(r => totalXP >= r.minXP) || RANKS[0];
  const nextRank = RANKS.find(r => r.level === currentRank.level + 1) || null;

  const currentLevelXP = totalXP - currentRank.minXP;
  const levelTargetXP = nextRank ? nextRank.minXP - currentRank.minXP : 1;
  const progressPercent = nextRank
    ? Math.min(100, Math.max(0, Math.round((currentLevelXP / levelTargetXP) * 100)))
    : 100;

  return {
    rank: currentRank,
    nextRank,
    progressPercent,
    currentLevelXP,
    levelTargetXP,
  };
}

export interface AchievementActionGuide {
  route: string;
  label: string;
  tip: string;
}

export function getAchievementActionGuide(achievement: Achievement): AchievementActionGuide {
  const t = achievement.condicion_tipo;

  if (t.includes("pomodoro") || t.includes("horas_estudio") || t.includes("sesiones_completadas")) {
    return {
      route: "/pomodoro",
      label: "Iniciar sesión de estudio",
      tip: "Utiliza el temporizador Pomodoro para acumular minutos de concentración y completar bloques de estudio.",
    };
  }

  if (t.includes("flashcard") || t.includes("mazo") || t.includes("precision")) {
    return {
      route: "/flashcards",
      label: "Ir a Flashcards",
      tip: "Crea nuevos mazos o repasa tus tarjetas de memoria con repetición espaciada.",
    };
  }

  if (
    t.includes("materia") ||
    t.includes("parcial") ||
    t.includes("final") ||
    t.includes("promedio") ||
    t.includes("regular")
  ) {
    return {
      route: "/carrera",
      label: "Gestionar Materias",
      tip: "Registra tus materias aprobadas, parciales o finales en el plan de tu carrera para validar este hito.",
    };
  }

  if (t.includes("documento") || t.includes("apunte")) {
    return {
      route: "/apuntes",
      label: "Abrir Apuntes",
      tip: "Crea documentos y resúmenes de estudio con el editor integrado estilo Notion.",
    };
  }

  if (t.includes("archivo") || t.includes("carpeta")) {
    return {
      route: "/biblioteca",
      label: "Ir a Biblioteca",
      tip: "Organiza tus apuntes, guías y documentos en carpetas dentro de la biblioteca virtual.",
    };
  }

  if (t.includes("evento")) {
    return {
      route: "/calendario",
      label: "Abrir Calendario",
      tip: "Programa fechas de exámenes, entregas y eventos académicos en tu cronograma.",
    };
  }

  if (t.includes("ai") || t.includes("mensaje_ai") || t.includes("sesion_ai")) {
    return {
      route: "/TABEAI",
      label: "Consultar Asistente IA",
      tip: "Inicia conversaciones académicas con el tutor inteligente para resolver dudas complejas.",
    };
  }

  if (t.includes("planta")) {
    return {
      route: "/bosque",
      label: "Ir al Bosque de Estudio",
      tip: "Mantén el foco sin distracciones durante tus sesiones para hacer florecer tus árboles.",
    };
  }

  if (t.includes("amigo") || t.includes("discord")) {
    return {
      route: "/tabetalk",
      label: "Abrir Tabetalk",
      tip: "Conéctate y comparte con la comunidad de compañeros para ganar puntos de colaboración.",
    };
  }

  if (achievement.categoria === "juegos") {
    return {
      route: "/juegos",
      label: "Explorar Minijuegos",
      tip: "Participa en desafíos y minijuegos educativos para desbloquear insignias y divertirte.",
    };
  }

  return {
    route: "/dashboard",
    label: "Continuar estudiando",
    tip: "Continúa avanzando en tus metas académicas para desbloquear este logro automáticamente.",
  };
}
