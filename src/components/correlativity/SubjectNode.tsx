
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Trophy, Lock, CheckCircle, Clock, BookOpen, X } from 'lucide-react';

const statusColors = {
    aprobada: {
        bgLight: "#fced47ff",
        bgDark: "#713f1280",
        handle: "#000000",
        icon: CheckCircle,
    },
    regular: {
        bgLight: "#dbeafe",
        bgDark: "#1e3a8a80",
        handle: "#000000",
        icon: Clock,
    },
    cursable: {
        bgLight: "#3aff7fff",
        bgDark: "#14532d80",
        handle: "#000000",
        icon: BookOpen,
    },
    bloqueada: {
        bgLight: "#f4f4f580",
        bgDark: "#27272a33",
        handle: "#a1a1aa",
        icon: Lock,
    },
    recursar: {
        bgLight: "#c40000ff",
        bgDark: "#7f1d1d80",
        handle: "#000000",
        icon: X,
    },
};

export const SubjectNode = memo(({ data }: NodeProps) => {
    const status = (data.status as keyof typeof statusColors) || 'bloqueada';
    const config = statusColors[status];
    const Icon = config.icon;
    const isFinalProject = data.label?.toString().toLowerCase().includes('proyecto final') ||
        data.label?.toString().toLowerCase().includes('tesis') ||
        data.label?.toString().toLowerCase().includes('práctica profesional');

    if (isFinalProject) {
        return (
            <div className="relative group hover:-translate-y-1 transition-transform">
                <Handle type="target" position={Position.Left} className="!bg-foreground !w-2 !h-2 !border-[2px] !border-foreground !-left-1.5" />
                <div
                    style={{
                        '--project-bg-light': "#fef9c3",
                        '--project-bg-dark': "#713f1280",
                    } as React.CSSProperties}
                    className={cn(
                        "relative w-[210px] p-4 rounded-xl border-[3px] border-foreground transition-all duration-300",
                        "bg-[var(--project-bg-light)] dark:bg-[var(--project-bg-dark)] text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]",
                    )}>
                    <div className="absolute -top-3 -right-3">
                        <div className="bg-foreground text-background p-2 rounded-lg border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                            <Trophy className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 bg-background border-2 border-foreground px-1.5 py-0.5 rounded w-fit text-foreground">
                        {data.codigo as string}
                    </div>

                    <div className="text-[13px] font-black uppercase tracking-wider leading-tight line-clamp-2">
                        {data.label as string}
                    </div>

                    <div className="mt-2 pt-2 border-t-[3px] border-foreground/20 flex items-center justify-between">
                        <span className="text-[10px] text-foreground font-black uppercase tracking-widest">Meta Final</span>
                    </div>
                </div>
                <Handle type="source" position={Position.Right} className="!bg-foreground !w-2 !h-2 !border-[2px] !border-foreground !-right-1.5" />
            </div>
        );
    }

    const nodeStyle = {
        '--node-bg-light': config.bgLight,
        '--node-bg-dark': config.bgDark,
        '--node-handle': config.handle,
    } as React.CSSProperties;

    return (
        <div className="relative group hover:-translate-y-0.5 transition-transform" style={nodeStyle}>
            <Handle type="target" position={Position.Left} className={cn("!w-2 !h-2 !border-[2px] !border-foreground !-left-1.5")} style={{ backgroundColor: 'var(--node-handle)' }} />

            <div className={cn(
                "w-[180px] p-3 rounded-xl border-[3px] border-foreground transition-all duration-200 text-left relative overflow-hidden",
                "bg-[var(--node-bg-light)] dark:bg-[var(--node-bg-dark)]",
                status !== 'bloqueada' ? "shadow-[4px_4px_0_0_hsl(var(--foreground))] text-foreground" : "border-opacity-70 shadow-none text-muted-foreground hover:border-red-500 hover:border-opacity-100"
            )}>
                {/* Locked Hover Overlay */}
                {status === 'bloqueada' && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <X className="w-14 h-14 text-red-500 scale-50 group-hover:scale-100 transition-transform duration-500 ease-out drop-shadow-[2px_2px_0_#000]" strokeWidth={3} />
                    </div>
                )}

                {/* Header: Code & Icon */}
                <div className="flex items-start justify-between mb-2">
                    <span className={cn("text-[10px] font-black uppercase px-1.5 py-0.5 rounded border-2",
                        status === 'bloqueada' ? "bg-background border-muted-foreground text-muted-foreground" : "bg-background border-foreground text-foreground"
                    )}>
                        {data.codigo as string}
                    </span>
                    <Icon className={cn("w-4 h-4 mt-0.5")} />
                </div>

                {/* Name */}
                <div className="font-black text-[11px] uppercase tracking-wider line-clamp-2 leading-tight">
                    {data.label as string}
                </div>
            </div>

            <Handle type="source" position={Position.Right} className={cn("!w-2 !h-2 !border-[2px] !border-foreground !-right-1.5")} style={{ backgroundColor: 'var(--node-handle)' }} />
        </div>
    );
});

SubjectNode.displayName = 'SubjectNode';
