
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
import { useSubjects } from "@/hooks/useSubjects";
import dagre from 'dagre';
import { Loader2 } from "lucide-react";
import { SubjectNode } from "@/components/correlativity/SubjectNode";

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

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 120 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: newNodes, edges };
};

function CorrelativityMapContent() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { subjects, loading } = useSubjects();

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
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#4ade80', width: 14, height: 14 },
                            style: { stroke: '#4ade80', strokeWidth: 1.5, opacity: 0.6 },
                        });
                    }
                    if (dep.requiere_regular) {
                        flowEdges.push({
                            id: `e-${dep.requiere_regular}-${subject.id}`,
                            source: dep.requiere_regular,
                            target: subject.id,
                            type: 'smoothstep',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee', width: 14, height: 14 },
                            style: { stroke: '#22d3ee', strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.5 },
                        });
                    }
                });
            });

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                flowNodes,
                flowEdges
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
        <div className="h-screen w-full bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-4 z-50 flex gap-2 items-center">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="bg-background/50 backdrop-blur hover:bg-background">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Card className="px-4 py-2 bg-background/60 backdrop-blur-xl border-border/30 shadow-2xl flex items-center gap-4">
                    <h1 className="font-bold text-lg gradient-text flex items-center gap-2">
                        <Zap className="text-neon-gold w-4 h-4" />
                        Mapa Neural
                    </h1>
                </Card>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                <Card className="px-5 py-2.5 bg-background/70 backdrop-blur-xl border-border/30 shadow-2xl flex gap-5 text-xs rounded-full">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div><span className="text-muted-foreground">Aprobada</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div><span className="text-muted-foreground">Regular</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div><span className="text-muted-foreground">Cursable</span></div>
                    <div className="flex items-center gap-1.5 opacity-40"><div className="w-2 h-2 rounded-full bg-zinc-500"></div><span className="text-muted-foreground">Bloqueada</span></div>
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
                    className="bg-background"
                    colorMode="dark"
                    minZoom={0.1}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
                >
                    <Controls className="bg-card/80 backdrop-blur border-border/50 rounded-xl text-foreground fill-foreground" position="bottom-right" />
                    <MiniMap className="bg-card/60 backdrop-blur border-border/50 rounded-xl" nodeColor="#4ade80" maskColor="rgba(0,0,0,0.7)" position="bottom-left" />
                    <Background gap={30} size={1} color="rgba(255,255,255,0.03)" variant={BackgroundVariant.Dots} />
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
