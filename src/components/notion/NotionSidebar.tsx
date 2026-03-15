import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
    Search, Plus, ChevronRight, Star, MoreHorizontal,
    Trash2, Heart, ChevronsLeft, GraduationCap, FileText,
} from "lucide-react";
import { NotionDocument } from "@/hooks/useNotionDocuments";
import { cn } from "@/lib/utils";
import { TabeIconRenderer } from "./TabeIcons";

interface Subject {
    id: string;
    nombre: string;
    codigo: string;
    año: number;
}

interface NotionSidebarProps {
    documents: NotionDocument[];
    subjects: Subject[];
    activeDocId: string | null;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onSelectDocument: (doc: NotionDocument) => void;
    onNewDocument: (subjectId: string) => void;
    onNewSubPage: (parentDoc: NotionDocument) => void;
    onDeleteDocument: (doc: NotionDocument) => void;
    onToggleFavorite: (doc: NotionDocument) => void;
    onHoverDocument?: (doc: NotionDocument) => void;
}

export function NotionSidebar({
    documents,
    subjects,
    activeDocId,
    collapsed,
    onToggleCollapse,
    onSelectDocument,
    onNewDocument,
    onNewSubPage,
    onDeleteDocument,
    onToggleFavorite,
    onHoverDocument,
}: NotionSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
    const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ doc: NotionDocument; x: number; y: number } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const DOCS_PER_SUBJECT_LIMIT = 8;

    // Close context menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [contextMenu]);

    const favorites = useMemo(
        () => documents.filter((d) => d.is_favorite),
        [documents]
    );

    const filteredDocs = useMemo(() => {
        const baseDocs = documents.filter(d => !d.parent_id); // Only root-level docs
        if (!searchQuery) return baseDocs;
        const q = searchQuery.toLowerCase();
        return baseDocs.filter(
            (d) =>
                d.titulo.toLowerCase().includes(q) ||
                d.subject?.nombre?.toLowerCase().includes(q) ||
                d.subject?.codigo?.toLowerCase().includes(q)
        );
    }, [documents, searchQuery]);

    // Get children of a document
    const getChildren = useCallback((parentId: string) => {
        return documents.filter(d => d.parent_id === parentId);
    }, [documents]);

    const toggleDoc = (id: string) => {
        setOpenDocs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Group docs by subject
    const docsBySubject = useMemo(() => {
        const map = new Map<string, NotionDocument[]>();
        const unlinked: NotionDocument[] = [];
        filteredDocs.forEach((doc) => {
            if (doc.subject_id) {
                const arr = map.get(doc.subject_id) || [];
                arr.push(doc);
                map.set(doc.subject_id, arr);
            } else {
                unlinked.push(doc);
            }
        });
        return { map, unlinked };
    }, [filteredDocs]);

    // Group subjects by year
    const subjectsByYear = useMemo(() => {
        const grouped = new Map<number, Subject[]>();
        subjects.forEach((s) => {
            const arr = grouped.get(s.año) || [];
            arr.push(s);
            grouped.set(s.año, arr);
        });
        return grouped;
    }, [subjects]);

    const toggleSubject = (id: string) => {
        setOpenSubjects((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleContextMenu = (e: React.MouseEvent, doc: NotionDocument) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ doc, x: e.clientX, y: e.clientY });
    };

    const renderDocItem = (doc: NotionDocument, isChild = false) => {
        const children = getChildren(doc.id);
        const hasChildren = children.length > 0;
        const isDocOpen = openDocs.has(doc.id);
        const isActive = activeDocId === doc.id;

        return (
            <div key={doc.id} className={cn("relative", isChild && "ml-4 pl-3 border-l border-border/40")}>
                <div
                    className={cn(
                        "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer text-sm font-medium my-1 outline-none relative overflow-hidden",
                        isActive 
                            ? "bg-primary/15 text-primary border border-primary/30 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                    )}
                    onClick={() => onSelectDocument(doc)}
                    onMouseEnter={() => onHoverDocument?.(doc)}
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                >
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/4 bg-primary rounded-r-lg shadow-[0_0_12px_rgba(168,85,247,0.9)]" />
                    )}

                    {hasChildren && (
                        <div 
                           onClick={(e) => { e.stopPropagation(); toggleDoc(doc.id); }} 
                           className="hover:bg-background rounded-md p-1 -ml-1 flex-shrink-0 transition-colors"
                        >
                            <ChevronRight
                                className={cn("w-3.5 h-3.5 transition-transform duration-300 opacity-70", isDocOpen && "rotate-90 text-primary opacity-100")}
                            />
                        </div>
                    )}
                    
                    <span className={cn(
                       "flex items-center justify-center shrink-0 w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                       !hasChildren && "ml-1"
                    )}>
                        <TabeIconRenderer iconId={doc.emoji || "book"} size={16} />
                    </span>
                    
                    <span className="truncate flex-1 tracking-wide">
                        {doc.titulo || "Sin título"}
                    </span>
                    
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 gap-1 shrink-0 translate-x-3 group-hover:translate-x-0">
                        <button
                            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-primary transition-colors shadow-sm border border-transparent hover:border-border/50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNewSubPage(doc);
                            }}
                            title="Nueva sub-página"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-primary transition-colors shadow-sm border border-transparent hover:border-border/50"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, doc);
                            }}
                            title="Más opciones"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                
                {hasChildren && isDocOpen && (
                    <div className="mt-1">
                        {children.map(child => renderDocItem(child, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <aside className={cn(
                "flex flex-col h-full bg-background/95 backdrop-blur-2xl border-r border-border/30 relative z-30 transition-all duration-500 shadow-2xl overflow-hidden",
                collapsed ? "w-0 min-w-0 opacity-0 -translate-x-8" : "w-[240px] min-w-[240px] translate-x-0"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-primary/20">
                            T
                        </div>
                        <span className="font-bold text-lg tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">T.A.B.E</span>
                    </div>
                    <button
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0"
                        onClick={onToggleCollapse}
                        title="Cerrar panel"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 pb-5 shrink-0 border-b border-border/20">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                        <div className="relative flex items-center bg-secondary/30 hover:bg-secondary/60 border border-border/40 rounded-xl overflow-hidden transition-all duration-300 focus-within:bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40 shadow-sm">
                            <Search className="w-4 h-4 ml-3.5 text-muted-foreground transition-colors group-focus-within:text-primary shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar apuntes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 px-3 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/70 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Favorites */}
                    {favorites.length > 0 && !searchQuery && (
                        <div>
                           <div className="flex items-center px-1 mb-3">
                                <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500 mr-2 border border-yellow-500/20">
                                   <Star className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase">Favoritos</span>
                            </div>
                            <div className="space-y-0.5">
                                {favorites.map(d => renderDocItem(d))}
                            </div>
                        </div>
                    )}

                    {/* Pages by subject */}
                    {!searchQuery ? (
                        <div>
                            <div className="flex items-center px-1 mb-4">
                                <div className="p-1.5 rounded-md bg-primary/10 text-primary mr-2 border border-primary/20">
                                   <FileText className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase">Materias</span>
                            </div>

                            <div className="space-y-5">
                                {Array.from(subjectsByYear.entries())
                                    .sort(([a], [b]) => a - b)
                                    .map(([year, yearSubjects]) => {
                                        // Only show subjects that have docs
                                        const subsWithDocs = yearSubjects.filter(
                                            (s) => (docsBySubject.map.get(s.id)?.length ?? 0) > 0
                                        );
                                        if (subsWithDocs.length === 0) return null;

                                        return (
                                            <div key={year} className="relative">
                                                {/* Left subtle guiding line */}
                                                <div className="absolute left-[11px] top-8 bottom-2 w-px bg-gradient-to-b from-border/60 to-transparent" />
                                                
                                                <div className="flex items-center px-1 py-1 mb-2 relative z-10">
                                                    <div className="w-[22px] h-[22px] rounded-full bg-background border-2 border-border/60 flex items-center justify-center mr-3 z-10 shadow-sm">
                                                        <span className="text-[10px] font-bold text-muted-foreground">{year}</span>
                                                    </div>
                                                    <span className="text-xs font-bold tracking-widest text-muted-foreground/70 uppercase">
                                                        Año {year}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-1.5 mt-2">
                                                    {subsWithDocs.map((subject) => {
                                                        const docs = docsBySubject.map.get(subject.id) || [];
                                                        const isOpen = openSubjects.has(subject.id);

                                                        return (
                                                            <div key={subject.id} className="relative z-10">
                                                                <button
                                                                    className={cn(
                                                                        "w-full flex items-center px-3 py-3 rounded-xl transition-all duration-300 group outline-none border",
                                                                        isOpen ? "bg-secondary/50 border-border/50 shadow-sm" : "bg-transparent border-transparent hover:bg-white/5 hover:border-border/30"
                                                                    )}
                                                                    onClick={() => toggleSubject(subject.id)}
                                                                >
                                                                    <div className={cn(
                                                                        "w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-500",
                                                                        isOpen ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(168,85,247,0.5)] rotate-3" : "bg-background border border-border/50 text-muted-foreground group-hover:bg-secondary group-hover:text-foreground group-hover:-rotate-3"
                                                                    )}>
                                                                        <GraduationCap className="w-4 h-4" />
                                                                    </div>
                                                                    
                                                                    <span className={cn(
                                                                        "text-sm font-bold transition-colors truncate tracking-wide",
                                                                        isOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                                                    )}>
                                                                        {subject.codigo}
                                                                    </span>

                                                                    <div className="ml-auto flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold bg-background border border-border/50 text-muted-foreground px-2 py-0.5 rounded-full flex items-center justify-center min-w-[24px] shadow-sm">
                                                                            {docs.length}
                                                                        </span>
                                                                        <ChevronRight className={cn(
                                                                            "w-4 h-4 text-muted-foreground transition-transform duration-500", 
                                                                            isOpen && "rotate-90 text-primary"
                                                                        )} />
                                                                    </div>
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="pt-2 pb-1 pl-[22px]">
                                                                        <div className="pl-3 border-l-2 border-border/30 py-1 space-y-1 relative">
                                                                            {/* Custom indicator line for the active subject docs */}
                                                                            <div className="absolute -left-[2px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 to-transparent opacity-50" />
                                                                            
                                                                            {(() => {
                                                                                const isExpanded = expandedSubjects.has(subject.id);
                                                                                const visibleDocs = isExpanded ? docs : docs.slice(0, DOCS_PER_SUBJECT_LIMIT);
                                                                                const hasMore = !isExpanded && docs.length > DOCS_PER_SUBJECT_LIMIT;
                                                                                return (
                                                                                    <>
                                                                                        {visibleDocs.map(d => renderDocItem(d))}
                                                                                        {hasMore && (
                                                                                            <button
                                                                                                className="w-full mt-2 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-primary bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 border border-dashed border-border/50 hover:border-primary/40 flex items-center justify-center gap-2"
                                                                                                onClick={() => setExpandedSubjects(prev => {
                                                                                                    const next = new Set(prev);
                                                                                                    next.add(subject.id);
                                                                                                    return next;
                                                                                                })}
                                                                                            >
                                                                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                                                                                Ver {docs.length - DOCS_PER_SUBJECT_LIMIT} apuntes más
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                            <button
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-all duration-300 group rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20"
                                                                                onClick={() => onNewDocument(subject.id)}
                                                                            >
                                                                                <div className="bg-background shadow-sm group-hover:bg-primary/20 rounded-md p-1.5 transition-colors border border-border/50 group-hover:border-primary/40">
                                                                                   <Plus className="w-3 h-3 group-hover:text-primary transition-colors" />
                                                                                </div>
                                                                                <span className="tracking-wide">Página en {subject.codigo}</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Docs without subject */}
                            {docsBySubject.unlinked.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center px-1 mb-3">
                                        <div className="p-1.5 rounded-md bg-secondary text-muted-foreground mr-2 border border-border/50">
                                           <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase">General</span>
                                    </div>
                                    <div className="space-y-0.5 pl-2">
                                       {docsBySubject.unlinked.map(d => renderDocItem(d))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Search results */
                        <div>
                            <div className="flex items-center px-1 mb-3">
                                <span className="text-xs font-bold tracking-widest text-primary uppercase">
                                    Resultados ({filteredDocs.length})
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                {filteredDocs.map(d => renderDocItem(d))}
                                {filteredDocs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3 border border-border/50">
                                            <Search className="w-5 h-5 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">No encontramos nada</p>
                                        <p className="text-xs text-muted-foreground mt-1">Prueba con otra palabra clave</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main New page button pinned to bottom */}
                <div className="p-4 bg-background/50 backdrop-blur-md shrink-0 relative z-10 border-t border-border/20 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
                    <button
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground text-sm font-bold transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 duration-300 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        onClick={() => {
                            const firstSub = subjects[0];
                            if (firstSub) onNewDocument(firstSub.id);
                        }}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="tracking-wide text-[15px]">Crear Apunte</span>
                    </button>
                </div>
            </aside>

            {/* Context menu for items */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    style={{
                        position: "fixed",
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 100,
                    }}
                    className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-2xl p-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                >
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg outline-none transition-colors hover:bg-white/10 hover:text-foreground"
                        onClick={() => {
                            onToggleFavorite(contextMenu.doc);
                            setContextMenu(null);
                        }}
                    >
                        <Heart className={cn("w-4 h-4", contextMenu.doc.is_favorite ? "text-primary fill-primary" : "")} />
                        <span>
                            {contextMenu.doc.is_favorite ? "Quitar favorito" : "Añadir a favoritos"}
                        </span>
                    </button>
                    <div className="h-px bg-border/40 my-1 mx-1" />
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg outline-none transition-colors text-destructive hover:bg-destructive/15"
                        onClick={() => {
                            onDeleteDocument(contextMenu.doc);
                            setContextMenu(null);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                    </button>
                </div>
            )}
        </>
    );
}
