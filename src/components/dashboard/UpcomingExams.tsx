import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exam {
  id: string;
  subject: string;
  type: "P1" | "P2" | "Global" | "Recuperatorio P1" | "Recuperatorio P2" | "Recuperatorio Global" | "Final" | "TP" | "Entrega" | "Clase" | "Otro";
  date: Date;
  daysLeft: number;
}

interface UpcomingExamsProps {
  exams: Exam[];
}

const examTypeConfig = {
  P1: { label: "Parcial 1", color: "bg-[#1475e5]/12 text-[#1475e5] border-[#1475e5]/20" },
  P2: { label: "Parcial 2", color: "bg-[#ff9415]/12 text-[#ff9415] border-[#ff9415]/20" },
  Global: { label: "Global", color: "bg-[#ffd21c]/12 text-[#d4a600] border-[#ffd21c]/20" },
  "Recuperatorio P1": { label: "Recup. P1", color: "bg-red-500/12 text-red-500 border-red-500/20" },
  "Recuperatorio P2": { label: "Recup. P2", color: "bg-red-500/12 text-red-500 border-red-500/20" },
  "Recuperatorio Global": { label: "Recup. Global", color: "bg-red-500/12 text-red-500 border-red-500/20" },
  Final: { label: "Final", color: "bg-[#48bd22]/12 text-[#48bd22] border-[#48bd22]/20" },
  TP: { label: "TP", color: "bg-[#ff9415]/12 text-[#ff9415] border-[#ff9415]/20" },
  Entrega: { label: "Entrega", color: "bg-[#ff9415]/12 text-[#ff9415] border-[#ff9415]/20" },
  Clase: { label: "Clase", color: "bg-[#1475e5]/12 text-[#1475e5] border-[#1475e5]/20" },
  Otro: { label: "Otro", color: "bg-secondary text-muted-foreground border-border" },
};

export function UpcomingExams({ exams }: UpcomingExamsProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="neo-bento-card bento-hover-red p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-lg">Próximos Exámenes</h3>
        <Calendar className="w-5 h-5 text-[#1475e5]" />
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">No hay exámenes próximos</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {exams.map((exam) => {
            const typeConfig = (examTypeConfig as any)[exam.type] || {
              label: exam.type || "Examen",
              color: "bg-secondary text-muted-foreground border-border"
            };
            return (
              <div
                key={exam.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-background border-[3px] border-foreground hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#ef4444] transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{exam.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-xs font-extrabold px-2 py-0.5 rounded-full border", typeConfig.color)}>
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">
                      {formatDate(exam.date)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-extrabold",
                    exam.daysLeft <= 3 ? "text-red-500" : exam.daysLeft <= 7 ? "text-[#ff9415]" : "text-[#48bd22]"
                  )}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exam.daysLeft}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
