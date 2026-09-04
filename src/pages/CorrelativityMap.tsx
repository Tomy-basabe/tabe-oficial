
import { useCallback, useMemo, useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    MarkerType,
    Node,
    Edge,
    Position,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ZoomIn, ZoomOut, Zap, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubjects, Subject } from "@/hooks/useSubjects";
import { Loader2 } from "lucide-react";
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
                <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Algo salió mal con el mapa</h2>
                    <p className="text-muted-foreground mb-4">Intenta recargar la página.</p>
                    <Button onClick={() => window.location.reload()}>Recargar</Button>
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

// Layout configuration — smaller nodes for a tighter neural look
const nodeWidth = 190;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], subjects: Subject[]) => {
    // We group nodes by year.
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
    const xSpacing = 350;
    const ySpacing = 120;

    // Get all unique years and sort them
    const years = Array.from(nodesByYear.keys()).sort((a, b) => a - b);

    years.forEach((year, yearIndex) => {
        const yearNodes = nodesByYear.get(year) || [];

        // Sort nodes within the same year by numero_materia or alphabetically
        yearNodes.sort((a, b) => {
            const subA = subjects.find(s => s.id === a.id);
            const subB = subjects.find(s => s.id === b.id);
            return (subA?.numero_materia || 0) - (subB?.numero_materia || 0);
        });

        // Calculate a starting Y so they are centered roughly (optional)
        const totalHeight = yearNodes.length * ySpacing;
        let startY = -totalHeight / 2;

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
    const { user } = useAuth();
    const navigate = useNavigate();
    const { subjects, loading } = useSubjects();
    const { theme } = useTheme();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (loading || subjects.length === 0) return;

        try {
            const flowNodes: Node[] = subjects.map((subject) => {
                const isProject = subject.nombre.toLowerCase().includes('proyecto') || subject.nombre.toLowerCase().includes('tesis');

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

            subjects.forEach((subject) => {
                subject.dependencies.forEach((dep) => {
                    if (dep.requiere_aprobada) {
                        flowEdges.push({
                            id: `e-${dep.requiere_aprobada}-${subject.id}`,
                            source: dep.requiere_aprobada,
                            target: subject.id,
                            type: 'smoothstep',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffd21c', width: 14, height: 14 },
                            style: { stroke: '#ffd21c', strokeWidth: 3, opacity: 0.8 },
                        });
                    }
                    if (dep.requiere_regular) {
                        flowEdges.push({
                            id: `e-${dep.requiere_regular}-${subject.id}`,
                            source: dep.requiere_regular,
                            target: subject.id,
                            type: 'smoothstep',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#1475e5', width: 14, height: 14 },
                            style: { stroke: '#1475e5', strokeWidth: 3, strokeDasharray: '6,4', opacity: 0.8 },
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

    }, [subjects, loading, setNodes, setEdges]);


    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground"><Loader2 className="animate-spin mr-2" /> Cargando mapa...</div>;
    }

    return (
        <div className="tabe-map h-screen w-full bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-4 z-50 flex gap-2 items-center">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="border-[3px] border-foreground bg-card hover:-translate-y-0.5 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all rounded-xl h-10 w-10">
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </Button>
                <Card className="px-4 py-2 bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl flex items-center gap-4">
                    <h1 className="font-black text-lg uppercase tracking-widest flex items-center gap-2 text-foreground">
                        <Zap className="text-foreground w-5 h-5 fill-yellow-400" />
                        Mapa de Correlativas
                    </h1>
                </Card>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:block">
                <Card className="px-5 py-3 bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex gap-5 text-[10px] rounded-xl font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-300 dark:bg-yellow-900/60 border-2 border-foreground"></div><span className="text-foreground">Aprobada</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-300 dark:bg-blue-900/60 border-2 border-foreground"></div><span className="text-foreground">Regular</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-300 dark:bg-green-900/60 border-2 border-foreground"></div><span className="text-foreground">Cursable</span></div>
                    <div className="flex items-center gap-2 opacity-50"><div className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800/60 border-2 border-foreground"></div><span className="text-foreground">Bloqueada</span></div>
                </Card>
            </div>

            <div className="flex-1 w-full h-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    className="bg-muted/10"
                    colorMode={theme}
                    minZoom={0.1}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
                >
                    <Controls className="bg-card border-[3px] border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground fill-foreground overflow-hidden" position="bottom-right" />
                    <MiniMap className="bg-card border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]" nodeColor="hsl(var(--foreground))" maskColor="rgba(100,100,100,0.2)" position="bottom-left" />
                    <Background gap={30} size={1} color="hsl(var(--foreground))" variant={BackgroundVariant.Dots} />
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
