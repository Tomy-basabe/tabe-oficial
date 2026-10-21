import { Calendar, Clock, ArrowRight, GraduationCap } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Exam {
  id: string;
  subject: string;
  date: Date;
  type?: string;
  daysLeft: number;
}

const examTypeConfig: Record<string, { label: string; badgeClass: string }> = {
  "P1": { label: "1º Parcial", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60" },
  "Parcial 1": { label: "1º Parcial", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60" },
  "P2": { label: "2º Parcial", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60" },
  "Parcial 2": { label: "2º Parcial", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60" },
  "Global": { label: "Global", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60" },
  "Recuperatorio P1": { label: "Recup. P1", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60" },
  "Recuperatorio P2": { label: "Recup. P2", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60" },
  "Recuperatorio Global": { label: "Recup. Global", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60" },
  "Recuperatorio": { label: "Recuperatorio", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60" },
  "Final": { label: "Final", badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60" },
};

function getExamTypeStyle(type?: string) {
  if (!type) return { label: "Examen", badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60" };
  if (examTypeConfig[type]) return examTypeConfig[type];

  const t = type.toLowerCase();
  if (t.includes("p1") || t.includes("parcial 1")) return examTypeConfig["P1"];
  if (t.includes("p2") || t.includes("parcial 2")) return examTypeConfig["P2"];
  if (t.includes("recup")) return examTypeConfig["Recuperatorio"];
  if (t.includes("global")) return examTypeConfig["Global"];
  if (t.includes("final")) return examTypeConfig["Final"];

  return { label: type, badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60" };
}

interface UpcomingExamsProps {
  exams: Exam[];
}

export function UpcomingExams({ exams }: UpcomingExamsProps) {
  const formatDate = (date: Date) => {
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    return format(date, "EEE, d MMM", { locale: es });
  };

  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <GraduationCap className="w-4 h-4" />
          </div>
          <h2 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">Tus Exámenes</h2>
        </div>
        <Link 
          to="/examenes" 
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
          <p className="text-xs text-zinc-500 font-medium">No hay exámenes próximos agendados</p>
          <Link
            to="/examenes"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline mt-2"
          >
            Ir a Exámenes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((exam) => {
            const typeConfig = getExamTypeStyle(exam.type);
            const isUrgent = exam.daysLeft <= 3;

            return (
              <Link
                key={exam.id}
                to="/examenes"
                className="group flex items-center justify-between p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all block cursor-pointer"
                title="Ver en Exámenes"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {exam.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.2 rounded border",
                      typeConfig.badgeClass
                    )}>
                      {typeConfig.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                      <Clock className="w-3 h-3" />
                      {formatDate(exam.date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md border",
                    isUrgent
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60"
                  )}>
                    {exam.daysLeft === 0 ? "Hoy" : `Faltan ${exam.daysLeft}d`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
