import { Flame, Trophy } from "lucide-react";

interface StudyStreakProps {
  currentStreak: number;
  bestStreak: number;
  weekData: { day: string; studied: boolean; minutes: number }[];
}

export function StudyStreak({ currentStreak, bestStreak, weekData }: StudyStreakProps) {
  return (
    <div className="neo-bento-card bento-hover-orange p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-lg">Racha de Estudio</h3>
        <Flame className="w-5 h-5 text-[#ff9415]" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="text-center p-3 rounded-xl bg-[#ff9415]/8 border border-[#ff9415]/20">
          <Flame className="w-6 h-6 mx-auto mb-1 text-[#ff9415]" />
          <p className="text-2xl font-black text-[#ff9415]">{currentStreak}</p>
          <p className="text-xs font-bold text-muted-foreground">Días seguidos</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[#ffd21c]/10 border border-[#ffd21c]/20">
          <Trophy className="w-6 h-6 mx-auto mb-1 text-[#ffd21c]" />
          <p className="text-2xl font-black text-[#ffd21c]">{bestStreak}</p>
          <p className="text-xs font-bold text-muted-foreground">Mejor racha</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1.5">
        {weekData.map((day) => (
          <div key={day.day} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full rounded-lg transition-all duration-300 ${
                day.studied ? "bg-[#1475e5]" : "bg-secondary"
              }`}
              style={{
                height: day.studied ? `${Math.max(20, (day.minutes / 120) * 60)}px` : "8px",
              }}
            />
            <span className={`text-xs font-bold mt-1.5 ${day.studied ? "text-foreground" : "text-muted-foreground"}`}>
              {day.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
