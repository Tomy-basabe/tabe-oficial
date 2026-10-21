import { useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Node,
    Edge,
    Position,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertTriangle, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubjects, Subject } from "@/hooks/useSubjects";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubjectNode } from "@/components/correlativity/SubjectNode";
import { useTheme } from "@/hooks/useTheme";

// --- Error Boundary Component ---
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Map Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#FAFAFA] dark:bg-[#171717]">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        Algo salió mal con el mapa
                    </h2>
                    <p className="text-xs text-zinc-500 mb-4">Intenta recargar la página para reintentar.</p>
                    <Button
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="rounded-lg text-xs"
                    >
                        Recargar
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Register custom node types
const nodeTypes = {
    subject: SubjectNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], subjects: Subject[]) => {
    // Agrupamos nodos por año
    const nodesByYear = new Map<number, Node[]>();

    nodes.forEach(node => {
        const subject = subjects.find(s => s.id === node.id);
        const year = subject?.año || 1;
        if (!nodesByYear.has(year)) {
            nodesByYear.set(year, []);
        }
        nodesByYear.get(year)?.push(node);
    });

    const newNodes: Node[] = [];
    const xSpacing = 320;
    const ySpacing = 110;

    // Años únicos ordenados
    const years = Array.from(nodesByYear.keys()).sort((a, b) => a - b);

    years.forEach((year, yearIndex) => {
        const yearNodes = nodesByYear.get(year) || [];

        // Ordenamos por número de materia
        yearNodes.sort((a, b) => {
            const subA = subjects.find(s => s.id === a.id);
            const subB = subjects.find(s => s.id === b.id);
            return (subA?.numero_materia || 0) - (subB?.numero_materia || 0);
        });

        // Centrado vertical
        const totalHeight = yearNodes.length * ySpacing;
        const startY = -totalHeight / 2;

        yearNodes.forEach((node, idx) => {
            newNodes.push({
                ...node,
                targetPosition: Position.Left,
                sourcePosition: Position.Right,
                position: {
                    x: yearIndex * xSpacing,
                    y: startY + idx * ySpacing,
                },
            });
        });
    });

    return { nodes: newNodes, edges };
};

function CorrelativityMapContent() {
    const navigate = useNavigate();
    const { subjects, loading, refetch } = useSubjects();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Métricas para las stats pills del header
    const stats = useMemo(() => {
        let aprobadas = 0;
        let regulares = 0;
        let cursables = 0;

        subjects.forEach((s) => {
            if (s.status === 'aprobada') aprobadas++;
            else if (s.status === 'regular') regulares++;
            else if (s.status === 'cursable') cursables++;
        });

        return { aprobadas, regulares, cursables };
    }, [subjects]);

    useEffect(() => {
        if (loading || subjects.length === 0) return;

        try {
            const flowNodes: Node[] = subjects.map((subject) => {
                const isProject =
                    subject.nombre.toLowerCase().includes('proyecto') ||
                    subject.nombre.toLowerCase().includes('tesis') ||
                    subject.nombre.toLowerCase().includes('práctica profesional');

                return {
                    id: subject.id,
                    type: 'subject',
                    data: {
                        label: subject.nombre,
                        codigo: subject.codigo,
                        status: subject.status,
                        nota: subject.nota,
                        isProject: isProject
                    },
                    position: { x: 0, y: 0 },
                };
            });

            const flowEdges: Edge[] = [];
            const edgeStroke = isDark ? '#52525b' : '#cbd5e1';
            const markerColor = isDark ? '#71717a' : '#94a3b8';

            subjects.forEach((subject) => {
                subject.dependencies.forEach((dep) => {
                    if (dep.requiere_aprobada) {
                        flowEdges.push({
                            id: `e-${dep.requiere_aprobada}-${subject.id}`,
                            source: dep.requiere_aprobada,
                            target: subject.id,
                            type: 'smoothstep',
                            animated: false,
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: markerColor,
                                width: 10,
                                height: 10
                            },
                            style: {
                                stroke: edgeStroke,
                                strokeWidth: 1.5,
                            },
                        });
                    }
                    if (dep.requiere_regular) {
                        flowEdges.push({
                            id: `e-${dep.requiere_regular}-${subject.id}`,
                            source: dep.requiere_regular,
                            target: subject.id,
                            type: 'smoothstep',
                            animated: false,
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: markerColor,
                                width: 10,
                                height: 10
                            },
                            style: {
                                stroke: edgeStroke,
                                strokeWidth: 1.5,
                                strokeDasharray: '4,4',
                            },
                        });
                    }
                });
            });

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                flowNodes,
                flowEdges,
                subjects
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (err) {
            console.error("Error calculating layout:", err);
        }
    }, [subjects, loading, isDark, setNodes, setEdges]);

    if (loading) {
        return <LoadingScreen fullScreen message="Cargando Mapa de Correlativas..." submessage="Generando grafo de la carrera..." />;
    }

    return (
        <div className="tabe-map h-screen w-full bg-[#FAFAFA] dark:bg-[#171717] flex flex-col relative overflow-hidden select-none">
            {/* Barra superior estilo Notion / Figma */}
            <header className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Botón Volver al Plan */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-1.5 h-9 shadow-xs text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Volver al Plan</span>
                    </Button>

                    {/* Título y Stats Pills */}
                    <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-1.5 h-9 shadow-xs flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Network className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                            <h1 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
                                Mapa de Correlatividades
                            </h1>
                        </div>

                        {/* Pills de estadísticas */}
                        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-800 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px]">
                                {subjects.length} materias
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                                {stats.aprobadas} aprobadas
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 font-mono text-[10px]">
                                {stats.regulares} regulares
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[10px]">
                                {stats.cursables} cursables
                            </span>
                        </div>
                    </div>
                </div>

                {/* Acciones derechas */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch(true)}
                        className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-1.5 h-9 shadow-xs text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Recargar mapa"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Recargar</span>
                    </Button>
                </div>
            </header>

            {/* Leyenda inferior sutil */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:block pointer-events-auto">
                <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs rounded-xl px-4 py-2 flex items-center gap-4 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Aprobada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span>Regular</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Cursable</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                        <span>Bloqueada</span>
                    </div>
                    <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3.5 border-b border-zinc-400 dark:border-zinc-500" />
                            <span>Req. Aprobada</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3.5 border-b border-dashed border-zinc-400 dark:border-zinc-500" />
                            <span>Req. Regular</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Lienzo de ReactFlow */}
            <div className="flex-1 w-full h-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    className="bg-transparent"
                    colorMode={isDark ? 'dark' : 'light'}
                    minZoom={0.1}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
                >
                    <Controls
                        position="bottom-right"
                        className="!bg-white/90 dark:!bg-zinc-900/90 !border !border-zinc-200/80 dark:!border-zinc-800/80 !rounded-xl !shadow-xs !overflow-hidden backdrop-blur-md [&>button]:!bg-transparent [&>button]:!border-b [&>button]:!border-zinc-200/80 dark:[&>button]:!border-zinc-800/80 [&>button]:!text-zinc-700 dark:[&>button]:!text-zinc-300 hover:[&>button]:!bg-zinc-100 dark:hover:[&>button]:!bg-zinc-800 [&>button:last-child]:!border-b-0"
                    />
                    <MiniMap
                        position="bottom-left"
                        className="!bg-white/80 dark:!bg-zinc-900/80 !border !border-zinc-200/80 dark:!border-zinc-800/80 !rounded-xl !shadow-xs !overflow-hidden backdrop-blur-xs"
                        nodeColor={(n) => {
                            const status = n.data?.status;
                            if (status === 'aprobada') return '#10b981';
                            if (status === 'regular') return '#0ea5e9';
                            if (status === 'cursable') return '#f59e0b';
                            return isDark ? '#3f3f46' : '#d4d4d8';
                        }}
                        maskColor={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'}
                    />
                    <Background
                        gap={24}
                        size={1}
                        color={isDark ? '#3f3f46' : '#cbd5e1'}
                        variant={BackgroundVariant.Dots}
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

export default function CorrelativityMap() {
    return (
        <MapErrorBoundary>
            <CorrelativityMapContent />
        </MapErrorBoundary>
    );
}
