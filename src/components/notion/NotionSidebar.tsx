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
            <div key={doc.id}>
                <div
                    className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-sm font-medium",
                        isActive 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                        isChild ? "ml-6" : "ml-1 mr-1 my-0.5"
                    )}
                    onClick={() => onSelectDocument(doc)}
                    onMouseEnter={() => onHoverDocument?.(doc)}
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                >
                    {hasChildren && (
                        <div 
                           onClick={(e) => { e.stopPropagation(); toggleDoc(doc.id); }} 
                           className="hover:bg-foreground/10 rounded-sm p-0.5 -ml-1 flex-shrink-0"
                        >
                            <ChevronRight
                                className={cn("w-3.5 h-3.5 transition-transform opacity-70", isDocOpen && "rotate-90")}
                            />
                        </div>
                    )}
                    <span className="flex items-center justify-center shrink-0">
                        <TabeIconRenderer iconId={doc.emoji || "book"} size={16} />
                    </span>
                    <span className="truncate flex-1">
                        {doc.titulo || "Sin título"}
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 shrink-0">
                        <button
                            className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNewSubPage(doc);
                            }}
                            title="Nueva sub-página"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
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
                    <div className="mt-0.5">
                        {children.map(child => renderDocItem(child, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <aside className={cn(
                "flex flex-col h-full bg-card/80 backdrop-blur-xl border-r border-border/50 relative z-30 transition-all duration-300",
                collapsed ? "w-0 min-w-0 opacity-0 overflow-hidden" : "w-[260px] min-w-[260px]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 flex-shrink-0">
                    <div className="flex items-center gap-2.5 font-bold text-base tracking-tight text-foreground">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[11px] text-primary-foreground shadow-sm">
                            T
                        </div>
                        <span className="truncate">T.A.B.E</span>
                    </div>
                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all flex-shrink-0"
                        onClick={onToggleCollapse}
                        title="Cerrar panel"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-3 pb-4 shrink-0">
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <input
                            type="text"
                            placeholder="Buscar apuntes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 bg-secondary/40 border border-transparent rounded-md text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/20 shadow-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Favorites */}
                    {favorites.length > 0 && !searchQuery && (
                        <div className="mb-4">
                            <div className="flex items-center px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                <Star className="w-3 h-3 mr-1.5" /> Favoritos
                            </div>
                            {favorites.map(d => renderDocItem(d))}
                        </div>
                    )}

                    {/* Pages by subject */}
                    {!searchQuery ? (
                        <div className="mb-2">
                            <div className="flex items-center px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                <FileText className="w-3 h-3 mr-1.5" /> Páginas
                            </div>

                            {Array.from(subjectsByYear.entries())
                                .sort(([a], [b]) => a - b)
                                .map(([year, yearSubjects]) => {
                                    // Only show subjects that have docs
                                    const subsWithDocs = yearSubjects.filter(
                                        (s) => (docsBySubject.map.get(s.id)?.length ?? 0) > 0
                                    );
                                    if (subsWithDocs.length === 0) return null;

                                    return (
                                        <div key={year} className="mb-3">
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                Año {year}
                                            </div>
                                            {subsWithDocs.map((subject) => {
                                                const docs = docsBySubject.map.get(subject.id) || [];
                                                const isOpen = openSubjects.has(subject.id);

                                                return (
                                                    <div key={subject.id} className="mb-0.5">
                                                        <button
                                                            className={cn(
                                                                "w-full flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-secondary/60 my-0.5",
                                                                isOpen ? "text-foreground" : "text-muted-foreground/90"
                                                            )}
                                                            onClick={() => toggleSubject(subject.id)}
                                                        >
                                                            <ChevronRight className={cn("w-3.5 h-3.5 mr-1 transition-transform opacity-70", isOpen && "rotate-90")} />
                                                            <GraduationCap className="w-3.5 h-3.5 mr-1.5 shrink-0 text-primary/70" />
                                                            <span className="truncate">{subject.codigo}</span>
                                                            <span className="ml-auto text-[10px] bg-secondary px-1.5 rounded-sm shrink-0">
                                                                {docs.length}
                                                            </span>
                                                        </button>
                                                        {isOpen && (
                                                            <div className="pl-[22px]">
                                                                {(() => {
                                                                    const isExpanded = expandedSubjects.has(subject.id);
                                                                    const visibleDocs = isExpanded ? docs : docs.slice(0, DOCS_PER_SUBJECT_LIMIT);
                                                                    const hasMore = !isExpanded && docs.length > DOCS_PER_SUBJECT_LIMIT;
                                                                    return (
                                                                        <>
                                                                            {visibleDocs.map(d => renderDocItem(d))}
                                                                            {hasMore && (
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-1 mt-1 text-xs text-muted-foreground hover:text-primary transition-colors pl-[26px]"
                                                                                    onClick={() => setExpandedSubjects(prev => {
                                                                                        const next = new Set(prev);
                                                                                        next.add(subject.id);
                                                                                        return next;
                                                                                    })}
                                                                                >
                                                                                    Ver {docs.length - DOCS_PER_SUBJECT_LIMIT} más...
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                                <button
                                                                    className="flex items-center w-full px-3 py-1 mt-1 text-[13px] font-medium text-muted-foreground hover:text-primary transition-colors group"
                                                                    onClick={() => onNewDocument(subject.id)}
                                                                >
                                                                    <div className="bg-secondary group-hover:bg-primary/20 rounded p-0.5 mr-2 transition-colors">
                                                                       <Plus className="w-3 h-3 group-hover:text-primary" />
                                                                    </div>
                                                                    Añadir página
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                            {/* Docs without subject */}
                            {docsBySubject.unlinked.length > 0 && (
                                <div className="mt-4">
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        Sin materia
                                    </div>
                                    {docsBySubject.unlinked.map(d => renderDocItem(d))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Search results */
                        <div className="mb-4">
                            <div className="flex items-center px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                Resultados ({filteredDocs.length})
                            </div>
                            {filteredDocs.map(d => renderDocItem(d))}
                            {filteredDocs.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-6">
                                    No se encontraron apuntes.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Main New page button pinned to bottom */}
                <div className="p-3 border-t border-border/30 bg-background/30 shrink-0">
                    <button
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary text-sm font-semibold transition-all shadow-sm"
                        onClick={() => {
                            const firstSub = subjects[0];
                            if (firstSub) onNewDocument(firstSub.id);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Página
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
                    className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                >
                    <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                            onToggleFavorite(contextMenu.doc);
                            setContextMenu(null);
                        }}
                    >
                        <Heart className="w-4 h-4" />
                        <span>
                            {contextMenu.doc.is_favorite ? "Quitar favorito" : "Agregar a favoritos"}
                        </span>
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm outline-none transition-colors text-destructive hover:bg-destructive/10"
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
