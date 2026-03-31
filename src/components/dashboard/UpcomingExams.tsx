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
  P1: { label: "Parcial 1", color: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30" },
  P2: { label: "Parcial 2", color: "bg-neon-purple/20 text-neon-purple border-neon-purple/30" },
  Global: { label: "Global", color: "bg-neon-gold/20 text-neon-gold border-neon-gold/30" },
  "Recuperatorio P1": { label: "Recup. P1", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Recuperatorio P2": { label: "Recup. P2", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Recuperatorio Global": { label: "Recup. Global", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  Final: { label: "Final", color: "bg-neon-green/20 text-neon-green border-neon-green/30" },
  TP: { label: "TP", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  Entrega: { label: "Entrega", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  Clase: { label: "Clase", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  Otro: { label: "Otro", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
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
    <div className="card-gamer rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Próximos Exámenes</h3>
        <Calendar className="w-5 h-5 text-muted-foreground" />
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay exámenes próximos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const typeConfig = (examTypeConfig as any)[exam.type] || {
              label: exam.type || "Examen",
              color: "bg-muted/20 text-muted-foreground border-muted/30"
            };
            return (
              <div
                key={exam.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{exam.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        typeConfig.color
                      )}
                    >
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(exam.date)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    exam.daysLeft <= 3 ? "text-neon-red" : exam.daysLeft <= 7 ? "text-neon-gold" : "text-neon-green"
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
