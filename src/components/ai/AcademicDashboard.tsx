
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, GraduationCap, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcademicStats {
    totalSubjects: number;
    approved: number;
    regular: number;
    cursando: number;
    level: number;
    xp: number;
    nextExam?: {
        title: string;
        date: string;
        daysLeft: number;
    };
}

const TIPS = [
    "La técnica Pomodoro (25m estudio / 5m descanso) mejora la retención.",
    "Explicar un tema en voz alta (Rubber Ducking) ayuda a entenderlo mejor.",
    "Dormir 8 horas es tan importante como estudiar 8 horas.",
    "Repasar lo visto en clase dentro de las 24hs aumenta la fijación.",
    "Hacer mapas mentales conecta conceptos mejor que releer textos.",
];

export function AcademicDashboard() {
    const { user, isGuest } = useAuth();
    const [stats, setStats] = useState<AcademicStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tip, setTip] = useState("");

    useEffect(() => {
        setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        if (!user && !isGuest) return;

        if (isGuest) {
            setStats({
                totalSubjects: 10,
                approved: 2,
                regular: 3,
                cursando: 5,
                level: 3,
                xp: 1450,
                nextExam: {
                    title: "Examen Final Ficticio",
                    date: "Mañana",
                    daysLeft: 1
                }
            });
            setLoading(false);
            return;
        }

        try {
            // First get subjects to count total
            const { data: subjects } = await supabase.from("subjects").select("id");

            // Get user subject status
            const { data: status } = await supabase.from("user_subject_status")
                .select("estado, subject_id")
                .eq("user_id", user.id);

            // Get next exam
            const { data: events } = await supabase.from("calendar_events")
                .select("titulo, fecha, tipo_examen")
                .eq("user_id", user.id)
                .gte("fecha", new Date().toISOString().split('T')[0])
                .order("fecha", { ascending: true })
                .limit(1);

            // Get user stats (level/xp)
            const { data: userStats } = await supabase.from("user_stats")
                .select("nivel, xp_total")
                .eq("user_id", user.id)
                .single();

            const total = subjects?.length || 0;
            const approved = status?.filter(s => s.estado === "aprobada").length || 0;
            const regular = status?.filter(s => s.estado === "regular").length || 0;
            const cursando = status?.filter(s => s.estado === "cursando").length || 0;

            let nextExam = undefined;
            // Define exam types that count for "Fire Mode"
            const examTypes = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global'];

            if (events && events.length > 0) {
                const exam = events[0];
                // Check if it's an actual exam
                if (examTypes.includes(exam.tipo_examen)) {
                    const examDate = new Date(exam.fecha + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const diffTime = examDate.getTime() - today.getTime();
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (daysLeft >= 0) {
                        nextExam = {
                            title: exam.titulo,
                            date: new Date(exam.fecha + 'T12:00:00').toLocaleDateString("es-AR", { day: 'numeric', month: 'short' }),
                            daysLeft
                        };
                    }
                }
            }

            setStats({
                totalSubjects: total,
                approved,
                regular,
                cursando,
                level: userStats?.nivel || 1,
                xp: userStats?.xp_total || 0,
                nextExam
            });

        } catch (error) {
            console.error("Error fetching academic stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) return <div className="h-32 animate-pulse bg-secondary/50 rounded-xl mb-6" />;

    const progressPercentage = Math.round((stats.approved / (stats.totalSubjects || 1)) * 100);
    const isFireMode = stats.nextExam && stats.nextExam.daysLeft <= 7;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Nivel y XP */}
            <Card className="p-4 border-none bg-secondary/50 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nivel {stats.level}</p>
                        <h3 className="text-2xl font-bold mt-1 bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">{stats.xp} XP</h3>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Trophy className="w-5 h-5 text-neon-gold" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Próximo nivel</span>
                        <span className="text-primary font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-1.5 bg-secondary" indicatorClassName="bg-neon-gold" />
                </div>
            </Card>

            {/* Progreso de Carrera */}
            <Card className="p-4 border-none bg-secondary/50 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Carrera</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <h3 className="text-2xl font-bold">{progressPercentage}%</h3>
                            <span className="text-xs text-muted-foreground">completada</span>
                        </div>
                    </div>
                    <div className="p-2 bg-neon-green/10 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-neon-green" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center relative z-10">
                    <div className="bg-background/50 rounded-lg p-1.5 border border-border/50">
                        <div className="text-lg font-bold text-neon-green">{stats.approved}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Aprob</div>
                    </div>
                    <div className="bg-background/50 rounded-lg p-1.5 border border-border/50">
                        <div className="text-lg font-bold text-neon-cyan">{stats.regular}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Reg</div>
                    </div>
                    <div className="bg-background/50 rounded-lg p-1.5 border border-border/50">
                        <div className="text-lg font-bold text-neon-purple">{stats.cursando}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Curs</div>
                    </div>
                </div>
            </Card>

            {/* Modo Fuego - Próximo Examen */}
            <Card className={cn(
                "p-4 border-none flex flex-col justify-between relative overflow-hidden transition-all duration-500",
                isFireMode
                    ? "bg-gradient-to-br from-orange-500/10 to-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-red-500/20"
                    : "bg-secondary/50"
            )}>
                <div className="flex justify-between items-start relative z-10">
                    <div className="flex-1">
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wider flex items-center gap-1.5",
                            isFireMode ? "text-orange-400" : "text-muted-foreground"
                        )}>
                            {isFireMode ? <><Flame className="w-3 h-3 animate-pulse text-orange-500" /> Modo Fuego</> : "Próximo Examen"}
                        </p>

                        {stats.nextExam ? (
                            <div className="mt-2">
                                <h3 className="text-sm font-bold truncate pr-2 leading-tight" title={stats.nextExam.title}>
                                    {stats.nextExam.title}
                                </h3>
                                <p className={cn(
                                    "text-xs font-semibold mt-1",
                                    stats.nextExam.daysLeft <= 3 ? "text-red-400" : "text-muted-foreground"
                                )}>
                                    {stats.nextExam.daysLeft === 0
                                        ? "¡ES HOY! 😱"
                                        : stats.nextExam.daysLeft === 1
                                            ? "¡Es mañana!"
                                            : `Faltan ${stats.nextExam.daysLeft} días`}
                                </p>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{stats.nextExam.date}</div>
                            </div>
                        ) : (
                            <div className="mt-2 text-sm text-muted-foreground">¡Sin exámenes a la vista! 🎉</div>
                        )}
                    </div>
                    <div className={cn(
                        "p-2 rounded-lg transition-colors flex-shrink-0 ml-2",
                        isFireMode ? "bg-orange-500/20 text-orange-500" : "bg-primary/10 text-primary"
                    )}>
                        {isFireMode ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <Flame className="w-5 h-5" />}
                    </div>
                </div>
            </Card>

            {/* Consejo del Día */}
            <Card className="p-4 border-none bg-secondary/50 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-neon-purple/5 rounded-bl-full" />
                <div className="flex justify-between items-start relative z-10">
                    <p className="text-xs text-neon-purple font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3 h-3" /> Tip del Día
                    </p>
                </div>
                <div className="relative z-10 flex-1 flex items-center">
                    <p className="text-xs mt-2 text-foreground/80 leading-relaxed font-medium italic">
                        "{tip}"
                    </p>
                </div>
            </Card>
        </div>
    );
}
