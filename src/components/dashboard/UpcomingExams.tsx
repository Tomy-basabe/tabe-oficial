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

const examTypeConfig: Record<string, { label: string; color: string }> = {
  "P1": { label: "1º Parcial", color: "bg-[#25d06c]/20 text-emerald-800 dark:text-emerald-300 border-emerald-600" },
  "Parcial 1": { label: "1º Parcial", color: "bg-[#25d06c]/20 text-emerald-800 dark:text-emerald-300 border-emerald-600" },
  "P2": { label: "2º Parcial", color: "bg-[#1475e5]/20 text-blue-800 dark:text-blue-300 border-blue-600" },
  "Parcial 2": { label: "2º Parcial", color: "bg-[#1475e5]/20 text-blue-800 dark:text-blue-300 border-blue-600" },
  "Global": { label: "Global", color: "bg-[#ffd21c]/20 text-amber-800 dark:text-amber-300 border-amber-600" },
  "Recuperatorio P1": { label: "Recup. P1", color: "bg-[#ff4e4e]/20 text-red-800 dark:text-red-300 border-red-600" },
  "Recuperatorio P2": { label: "Recup. P2", color: "bg-[#ff4e4e]/20 text-red-800 dark:text-red-300 border-red-600" },
  "Recuperatorio Global": { label: "Recup. Global", color: "bg-[#ff4e4e]/20 text-red-800 dark:text-red-300 border-red-600" },
  "Recuperatorio": { label: "Recuperatorio", color: "bg-[#ff4e4e]/20 text-red-800 dark:text-red-300 border-red-600" },
  "Final": { label: "Final", color: "bg-[#805ad5]/20 text-purple-800 dark:text-purple-300 border-purple-600" },
};

function getExamTypeStyle(type?: string) {
  if (!type) return { label: "Examen", color: "bg-secondary text-foreground border-foreground/40" };
  if (examTypeConfig[type]) return examTypeConfig[type];

  const t = type.toLowerCase();
  if (t.includes("p1") || t.includes("parcial 1")) return examTypeConfig["P1"];
  if (t.includes("p2") || t.includes("parcial 2")) return examTypeConfig["P2"];
  if (t.includes("recup")) return examTypeConfig["Recuperatorio"];
  if (t.includes("global")) return examTypeConfig["Global"];
  if (t.includes("final")) return examTypeConfig["Final"];

  return { label: type, color: "bg-secondary text-foreground border-foreground/40" };
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
    <div className="neo-bento-card bg-muted/30 dark:bg-background p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-foreground" />
          <h2 className="font-black text-2xl uppercase">Tus Exámenes</h2>
        </div>
        <Link 
          to="/examenes" 
          className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors hover:underline"
        >
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 border-[3px] border-dashed border-border rounded-xl">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30 text-foreground" />
          <p className="text-sm font-bold text-foreground">No hay exámenes próximos agendados</p>
          <Link
            to="/examenes"
            className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary hover:underline mt-2"
          >
            Ir a Exámenes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const typeConfig = getExamTypeStyle(exam.type);
            const isUrgent = exam.daysLeft <= 3;
            const isWarning = exam.daysLeft > 3 && exam.daysLeft <= 7;

            return (
              <Link
                key={exam.id}
                to="/examenes"
                className={cn(
                  "relative flex items-stretch rounded-lg border-[3px] border-foreground overflow-hidden hover:-translate-y-1 transition-all group bg-card block cursor-pointer",
                  isUrgent ? "shadow-[4px_4px_0_0_#ef4444]" :
                    isWarning ? "shadow-[4px_4px_0_0_#ff9415]" :
                      "shadow-[4px_4px_0_0_#000000] dark:shadow-[4px_4px_0_0_#ffffff]"
                )}
                title="Ver en Exámenes"
              >
                {/* Ticket Stub (Left Side) */}
                <div className={cn(
                  "w-16 flex flex-col items-center justify-center border-r-[3px] border-dashed border-foreground/50 shrink-0",
                  isUrgent ? "bg-red-500 text-white" :
                    isWarning ? "bg-orange-400 text-foreground" :
                      "bg-foreground text-background"
                )}>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1">Faltan</span>
                  <span className="text-2xl font-black leading-none">{exam.daysLeft}</span>
                  <span className="text-[10px] font-black uppercase">días</span>
                </div>

                {/* Ticket Body */}
                <div className="flex-1 p-3 min-w-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmZmYiPjwvcmVjdD48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZTVlN2ViIj48L3JlY3Q+PC9zdmc+')] dark:bg-none dark:bg-card">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-sm truncate text-foreground pr-2 group-hover:text-primary transition-colors">{exam.subject}</p>
                    <ArrowRight className="w-4 h-4 text-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded-sm border-2 uppercase",
                      typeConfig.color
                    )}>
                      {typeConfig.label}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-foreground/70 bg-secondary px-1.5 py-0.5 rounded-sm border-2 border-foreground/10">
                      <Clock className="w-3 h-3" />
                      {formatDate(exam.date)}
                    </div>
                  </div>
                </div>

                {/* Right edge perforation decorative */}
                <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-around py-1 overflow-hidden opacity-20 pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
