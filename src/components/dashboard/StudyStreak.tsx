import { Flame, Trophy, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyStreakProps {
  currentStreak: number;
  bestStreak: number;
  weekData: { day: string; studied: boolean; minutes: number }[];
}

export function StudyStreak({ currentStreak, bestStreak, weekData }: StudyStreakProps) {
  // Pad week data if it doesn't have 7 days
  const paddedWeekData = [...weekData];
  while (paddedWeekData.length < 7) {
    paddedWeekData.push({ day: "-", studied: false, minutes: 0 });
  }
  const last7Days = paddedWeekData.slice(-7);

  return (
    <div className="neo-bento-card bg-[#fff5eb] dark:bg-background border-[4px] border-foreground p-5 lg:p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-foreground" />
          <h3 className="font-black text-xl uppercase tracking-widest text-foreground">Asistencia</h3>
        </div>
        <div className="bg-foreground text-background font-black text-xs px-2 py-1 rounded">
          SELLO DIARIO
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 flex items-center gap-3 bg-white dark:bg-card p-3 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#ffffff]">
          <div className="w-10 h-10 bg-[#ff9415] rounded-full flex items-center justify-center border-2 border-foreground shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black leading-none text-foreground">{currentStreak}</p>
            <p className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">Racha Actual</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-3 bg-white dark:bg-card p-3 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#ffffff]">
          <div className="w-10 h-10 bg-[#ffd21c] rounded-full flex items-center justify-center border-2 border-foreground shrink-0">
            <Trophy className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-black leading-none text-foreground">{bestStreak}</p>
            <p className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">Mejor Racha</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-card border-[3px] border-foreground rounded-xl p-4 shadow-[inset_2px_2px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_2px_2px_0_rgba(255,255,255,0.05)]">
        <p className="text-[10px] font-black uppercase text-center mb-3 text-foreground/60 tracking-widest">
          Tarjeta de Sellos Semanal
        </p>
        <div className="flex justify-between gap-1 sm:gap-2">
          {last7Days.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-foreground flex items-center justify-center relative",
                day.studied ? "bg-[#ff9415]" : "bg-muted"
              )}>
                {day.studied ? (
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
                )}
                {/* Stamp visual effect */}
                {day.studied && (
                  <div className="absolute inset-0 border-2 border-white rounded-full opacity-30 scale-90 border-dashed"></div>
                )}
              </div>
              <span className="text-[10px] font-black uppercase text-foreground">
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
