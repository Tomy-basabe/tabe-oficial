import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Trophy, Lock, CheckCircle2, Clock, BookOpen, AlertCircle } from 'lucide-react';

interface StatusConfig {
    label: string;
    badgeClass: string;
    dotClass: string;
    icon: React.ComponentType<{ className?: string }>;
}

const statusConfigs: Record<string, StatusConfig> = {
    aprobada: {
        label: 'Aprobada',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        icon: CheckCircle2,
    },
    regular: {
        label: 'Regular',
        badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
        dotClass: 'bg-sky-500',
        icon: Clock,
    },
    cursable: {
        label: 'Cursable',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500',
        icon: BookOpen,
    },
    bloqueada: {
        label: 'Bloqueada',
        badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
        dotClass: 'bg-zinc-400 dark:bg-zinc-600',
        icon: Lock,
    },
    recursar: {
        label: 'Recursar',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-500',
        icon: AlertCircle,
    },
};

export const SubjectNode = memo(({ data }: NodeProps) => {
    const status = (data.status as keyof typeof statusConfigs) || 'bloqueada';
    const config = statusConfigs[status] || statusConfigs.bloqueada;
    const isBlocked = status === 'bloqueada';

    const isFinalProject =
        data.label?.toString().toLowerCase().includes('proyecto final') ||
        data.label?.toString().toLowerCase().includes('tesis') ||
        data.label?.toString().toLowerCase().includes('práctica profesional');

    if (isFinalProject) {
        return (
            <div className="relative group">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-2 !h-2 !bg-amber-500 !border !border-white dark:!border-zinc-900 !rounded-full !-left-1 transition-transform group-hover:scale-125"
                />
                <div
                    className={cn(
                        "w-[210px] p-3 rounded-xl border transition-all duration-200 text-left relative",
                        "border-amber-300/80 dark:border-amber-600/40 bg-gradient-to-br from-amber-50/70 via-white to-white dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-900",
                        "shadow-2xs hover:shadow-sm hover:border-amber-400 dark:hover:border-amber-500/60"
                    )}
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold tracking-tight">
                            {data.codigo as string}
                        </span>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span>Meta Final</span>
                        </div>
                    </div>

                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                        {data.label as string}
                    </div>

                    {data.nota ? (
                        <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[10px] font-mono text-amber-800 dark:text-amber-300">
                            <span>Nota final</span>
                            <span className="font-bold">{data.nota as number}</span>
                        </div>
                    ) : null}
                </div>
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-2 !h-2 !bg-amber-500 !border !border-white dark:!border-zinc-900 !rounded-full !-right-1 transition-transform group-hover:scale-125"
                />
            </div>
        );
    }

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-full !-left-1 transition-transform group-hover:scale-125"
            />

            <div
                className={cn(
                    "w-[210px] p-3 rounded-xl border transition-all duration-200 text-left relative",
                    "bg-white dark:bg-[#212121] border-zinc-200/80 dark:border-zinc-800/80",
                    "shadow-2xs hover:shadow-sm hover:border-zinc-400/80 dark:hover:border-zinc-600/80",
                    isBlocked && "opacity-65 hover:opacity-100 bg-zinc-50/60 dark:bg-zinc-900/40"
                )}
            >
                {/* Header: Código + Micro Badge de Estado */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 tracking-tight">
                        {data.codigo as string}
                    </span>
                    <div
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border",
                            config.badgeClass
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)} />
                        <span>{config.label}</span>
                    </div>
                </div>

                {/* Nombre de la materia */}
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                    {data.label as string}
                </div>

                {/* Footer: Nota si existe */}
                {data.nota ? (
                    <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                        <span>Nota</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{data.nota as number}</span>
                    </div>
                ) : null}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-full !-right-1 transition-transform group-hover:scale-125"
            />
        </div>
    );
});

SubjectNode.displayName = 'SubjectNode';
