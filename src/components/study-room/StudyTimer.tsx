import { useState, useEffect } from "react";
import { Clock, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/hooks/useStudyRoom";

interface StudyTimerProps {
  sessionStartTime: Date | null;
  subjects: Subject[];
  currentSubjectId: string | null;
  onSubjectChange: (subjectId: string | null) => void;
}

export function StudyTimer({
  sessionStartTime,
  subjects,
  currentSubjectId,
  onSubjectChange,
}: StudyTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentSubject = subjects.find(s => s.id === currentSubjectId);

  return (
    <div className="flex items-center gap-4 p-3 bg-card/80 backdrop-blur-md border-b border-border">
      {/* Timer */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg">
        <Clock className="w-4 h-4 text-primary" />
        <span className="font-mono font-semibold text-lg tabular-nums">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Subject Selector */}
      <div className="flex items-center gap-2 flex-1">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <Select
          value={currentSubjectId || "none"}
          onValueChange={(value) => onSubjectChange(value === "none" ? null : value)}
        >
          <SelectTrigger className="w-[250px] bg-secondary/50 border-0">
            <SelectValue placeholder="Selecciona materia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin materia específica</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.codigo} - {subject.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
