
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Trophy, Lock, CheckCircle, Clock, BookOpen, X } from 'lucide-react';

const statusStyles = {
    aprobada: {
        ring: "ring-green-500/60",
        bg: "bg-green-500/15",
        dot: "bg-green-400",
        text: "text-green-400",
        icon: CheckCircle,
        glow: "shadow-[0_0_20px_rgba(34,197,94,0.25)]",
        handleColor: "!bg-green-400",
    },
    regular: {
        ring: "ring-cyan-500/60",
        bg: "bg-cyan-500/15",
        dot: "bg-cyan-400",
        text: "text-cyan-400",
        icon: Clock,
        glow: "shadow-[0_0_20px_rgba(6,182,212,0.25)]",
        handleColor: "!bg-cyan-400",
    },
    cursable: {
        ring: "ring-blue-500/60",
        bg: "bg-blue-500/15",
        dot: "bg-blue-400",
        text: "text-blue-400",
        icon: BookOpen,
        glow: "shadow-[0_0_20px_rgba(59,130,246,0.25)]",
        handleColor: "!bg-blue-400",
    },
    bloqueada: {
        ring: "ring-zinc-600/40",
        bg: "bg-zinc-800/30",
        dot: "bg-zinc-500",
        text: "text-zinc-500",
        icon: Lock,
        glow: "",
        handleColor: "!bg-zinc-500",
    },
    recursar: {
        ring: "ring-red-500/60",
        bg: "bg-red-500/15",
        dot: "bg-red-400",
        text: "text-red-400",
        icon: X,
        glow: "shadow-[0_0_20px_rgba(239,68,68,0.25)]",
        handleColor: "!bg-red-400",
    },
};

export const SubjectNode = memo(({ data }: NodeProps) => {
    const status = (data.status as keyof typeof statusStyles) || 'bloqueada';
    const style = statusStyles[status];
    const Icon = style.icon;
    const isFinalProject = data.label?.toString().toLowerCase().includes('proyecto final') ||
        data.label?.toString().toLowerCase().includes('tesis') ||
        data.label?.toString().toLowerCase().includes('práctica profesional');

    if (isFinalProject) {
        return (
            <div className="relative group">
                <Handle type="target" position={Position.Left} className="!bg-yellow-400 !w-2.5 !h-2.5 !border-0 !-left-1" />
                <div className={cn(
                    "relative w-[200px] p-4 rounded-2xl border border-yellow-500/40 transition-all duration-500",
                    "bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10",
                    "shadow-[0_0_30px_rgba(250,204,21,0.2)] hover:shadow-[0_0_50px_rgba(250,204,21,0.4)]",
                    "hover:scale-105 backdrop-blur-xl ring-1 ring-yellow-500/30",
                )}>
                    <div className="absolute -top-2.5 -right-2.5">
                        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black p-1.5 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse">
                            <Trophy className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <div className="text-[10px] font-mono text-yellow-500/70 uppercase tracking-widest mb-1">
                        {data.codigo as string}
                    </div>

                    <div className="text-sm font-display font-bold text-foreground leading-tight">
                        {data.label as string}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-[10px] text-yellow-400/80 font-semibold uppercase tracking-wider">Meta Final</span>
                    </div>
                </div>
                <Handle type="source" position={Position.Right} className="!bg-yellow-400 !w-2.5 !h-2.5 !border-0 !-right-1" />
            </div>
        );
    }

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} className={cn("!w-2 !h-2 !border-0 !-left-1", style.handleColor)} />

            <div className={cn(
                "w-[170px] p-3 rounded-xl border border-white/[0.06] backdrop-blur-md transition-all duration-300",
                "ring-1", style.ring, style.bg, style.glow,
                "group-hover:scale-[1.04] group-hover:ring-2",
            )}>
                {/* Status dot + code */}
                <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", style.dot)} />
                    <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider truncate">{data.codigo as string}</span>
                    <Icon className={cn("w-3 h-3 flex-shrink-0 ml-auto opacity-70", style.text)} />
                </div>

                {/* Name */}
                <div className="font-semibold text-[13px] text-foreground line-clamp-2 leading-snug">
                    {data.label as string}
                </div>

                {/* Nota badge */}
                {status === 'aprobada' && data.nota && (
                    <div className="mt-1.5">
                        <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                            {data.nota as number}/10
                        </span>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} className={cn("!w-2 !h-2 !border-0 !-right-1", style.handleColor)} />
        </div>
    );
});

SubjectNode.displayName = 'SubjectNode';
