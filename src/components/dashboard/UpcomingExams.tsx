import { Calendar, Clock, ArrowRight } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Exam {
  id: string;
  subject: string;
  date: Date;
  type?: "Parcial 1" | "Parcial 2" | "Final" | "Recuperatorio" | "Global";
  daysLeft: number;
}

const examTypeConfig = {
  "Parcial 1": { label: "1º Parcial", color: "bg-blue-200 text-blue-900 border-blue-900" },
  "Parcial 2": { label: "2º Parcial", color: "bg-purple-200 text-purple-900 border-purple-900" },
  "Final": { label: "Final", color: "bg-red-200 text-red-900 border-red-900" },
  "Recuperatorio": { label: "Recuperatorio", color: "bg-orange-200 text-orange-900 border-orange-900" },
  "Global": { label: "Global", color: "bg-yellow-200 text-yellow-900 border-yellow-900" }
};

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
    <div className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] rounded-xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-foreground" />
          <h2 className="font-black text-2xl uppercase">Tus Examenes</h2>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 border-[3px] border-dashed border-border rounded-xl">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-foreground" />
          <p className="text-sm font-bold text-foreground">No hay turnos agendados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const typeConfig = (examTypeConfig as any)[exam.type] || {
              label: exam.type || "Examen",
              color: "bg-secondary text-muted-foreground border-foreground"
            };

            const isUrgent = exam.daysLeft <= 3;
            const isWarning = exam.daysLeft > 3 && exam.daysLeft <= 7;

            return (
              <div
                key={exam.id}
                className={cn(
                  "relative flex items-stretch rounded-lg border-[3px] border-foreground overflow-hidden hover:-translate-y-1 transition-transform group bg-card",
                  isUrgent ? "shadow-[4px_4px_0_0_#ef4444]" :
                    isWarning ? "shadow-[4px_4px_0_0_#ff9415]" :
                      "shadow-[4px_4px_0_0_#000000] dark:shadow-[4px_4px_0_0_#ffffff]"
                )}
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
                    <p className="font-black text-sm truncate text-foreground pr-2">{exam.subject}</p>
                    <ArrowRight className="w-4 h-4 text-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-around py-1 overflow-hidden opacity-20">
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                  <div className="w-2 h-2 rounded-full bg-foreground -translate-x-1"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
