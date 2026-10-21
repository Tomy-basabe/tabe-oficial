export interface ExamTheme {
  badge: string;
  dot: string;
  label?: string;
}

export function getExamTheme(tipoExamen?: string | null): ExamTheme {
  const tipo = (tipoExamen || "").trim().toLowerCase();

  if (tipo.includes("p1") || tipo.includes("primer")) {
    return {
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
      dot: "bg-emerald-500",
      label: "Primer Parcial",
    };
  }

  if (tipo.includes("p2") || tipo.includes("segundo")) {
    return {
      badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
      dot: "bg-sky-500",
      label: "Segundo Parcial",
    };
  }

  if (tipo.includes("final")) {
    return {
      badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
      dot: "bg-purple-500",
      label: "Examen Final",
    };
  }

  if (tipo.includes("global")) {
    return {
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
      dot: "bg-amber-500",
      label: "Examen Global",
    };
  }

  if (tipo.includes("recuperatorio")) {
    return {
      badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
      dot: "bg-rose-500",
      label: "Recuperatorio",
    };
  }

  return {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
    dot: "bg-zinc-400",
    label: tipoExamen || "Evaluación",
  };
}
