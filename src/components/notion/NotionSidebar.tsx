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

        return (
            <div key={doc.id}>
                <div
                    className={cn("notion-sidebar-item", activeDocId === doc.id && "active", isChild && "notion-sidebar-item--child")}
                    onClick={() => onSelectDocument(doc)}
                    onMouseEnter={() => onHoverDocument?.(doc)}
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                >
                    {hasChildren && (
                        <ChevronRight
                            className={cn("notion-sidebar-item-children-indicator", isDocOpen && "open")}
                            onClick={(e) => { e.stopPropagation(); toggleDoc(doc.id); }}
                        />
                    )}
                    <span className="notion-sidebar-item-emoji"><TabeIconRenderer iconId={doc.emoji || "book"} size={18} /></span>
                    <span className="notion-sidebar-item-title">
                        {doc.titulo || "Sin título"}
                    </span>
                    <div className="notion-sidebar-item-actions">
                        <button
                            className="notion-sidebar-item-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNewSubPage(doc);
                            }}
                            title="Nueva sub-página"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="notion-sidebar-item-action"
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
                    <div style={{ paddingLeft: 12 }}>
                        {children.map(child => renderDocItem(child, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <aside className={cn("notion-sidebar", collapsed && "collapsed")}>
                {/* Header */}
                <div className="notion-sidebar-header">
                    <div className="notion-sidebar-workspace">
                        <div className="notion-sidebar-workspace-icon">T</div>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>T.A.B.E</span>
                    </div>
                    <button
                        className="notion-sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        title="Cerrar sidebar"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="notion-sidebar-search">
                    <Search className="notion-sidebar-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                <div className="notion-sidebar-content">
                    {/* Favorites */}
                    {favorites.length > 0 && !searchQuery && (
                        <div className="notion-sidebar-section">
                            <div className="notion-sidebar-section-title">
                                <Star className="w-3 h-3 mr-1" /> Favoritos
                            </div>
                            {favorites.map(d => renderDocItem(d))}
                        </div>
                    )}

                    {/* Pages by subject */}
                    {!searchQuery ? (
                        <div className="notion-sidebar-section">
                            <div className="notion-sidebar-section-title">
                                <FileText className="w-3 h-3 mr-1" /> Páginas
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
                                        <div key={year} style={{ marginBottom: 2 }}>
                                            <div
                                                className="notion-sidebar-section-title"
                                                style={{ paddingTop: 8 }}
                                            >
                                                Año {year}
                                            </div>
                                            {subsWithDocs.map((subject) => {
                                                const docs = docsBySubject.map.get(subject.id) || [];
                                                const isOpen = openSubjects.has(subject.id);

                                                return (
                                                    <div key={subject.id}>
                                                        <button
                                                            className={cn(
                                                                "notion-sidebar-subject-toggle",
                                                                isOpen && "open"
                                                            )}
                                                            onClick={() => toggleSubject(subject.id)}
                                                        >
                                                            <ChevronRight className="w-3 h-3" />
                                                            <GraduationCap className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                {subject.codigo}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    marginLeft: "auto",
                                                                    fontSize: 11,
                                                                    opacity: 0.5,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {docs.length}
                                                            </span>
                                                        </button>
                                                        {isOpen && (
                                                            <div style={{ paddingLeft: 8 }}>
                                                                {(() => {
                                                                    const isExpanded = expandedSubjects.has(subject.id);
                                                                    const visibleDocs = isExpanded ? docs : docs.slice(0, DOCS_PER_SUBJECT_LIMIT);
                                                                    const hasMore = !isExpanded && docs.length > DOCS_PER_SUBJECT_LIMIT;
                                                                    return (
                                                                        <>
                                                                            {visibleDocs.map(d => renderDocItem(d))}
                                                                            {hasMore && (
                                                                                <button
                                                                                    className="notion-sidebar-new-page"
                                                                                    onClick={() => setExpandedSubjects(prev => {
                                                                                        const next = new Set(prev);
                                                                                        next.add(subject.id);
                                                                                        return next;
                                                                                    })}
                                                                                    style={{ paddingLeft: 20, fontSize: 12, opacity: 0.7 }}
                                                                                >
                                                                                    Ver {docs.length - DOCS_PER_SUBJECT_LIMIT} más...
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                                <button
                                                                    className="notion-sidebar-new-page"
                                                                    onClick={() => onNewDocument(subject.id)}
                                                                    style={{ paddingLeft: 20, fontSize: 13 }}
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    Nueva página
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
                                <div style={{ marginTop: 4 }}>
                                    <div className="notion-sidebar-section-title">Sin materia</div>
                                    {docsBySubject.unlinked.map(d => renderDocItem(d))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Search results */
                        <div className="notion-sidebar-section">
                            <div className="notion-sidebar-section-title">
                                Resultados ({filteredDocs.length})
                            </div>
                            {filteredDocs.map(d => renderDocItem(d))}
                            {filteredDocs.length === 0 && (
                                <p
                                    style={{
                                        padding: "12px",
                                        fontSize: 13,
                                        color: "hsl(var(--muted-foreground))",
                                        textAlign: "center",
                                    }}
                                >
                                    Sin resultados
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* New page button */}
                <button
                    className="notion-sidebar-new-page tour-notion-create"
                    onClick={() => {
                        // Open the first subject with docs, or the first subject
                        const firstSub = subjects[0];
                        if (firstSub) onNewDocument(firstSub.id);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    Nueva página
                </button>
            </aside>

            {/* Context menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    style={{
                        position: "fixed",
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 100,
                    }}
                    className="bg-card border border-border rounded-lg shadow-xl p-1.5 min-w-[160px]"
                >
                    <button
                        className="notion-sidebar-item w-full text-left"
                        onClick={() => {
                            onToggleFavorite(contextMenu.doc);
                            setContextMenu(null);
                        }}
                    >
                        <Heart className="w-3.5 h-3.5" />
                        <span className="notion-sidebar-item-title">
                            {contextMenu.doc.is_favorite ? "Quitar favorito" : "Agregar a favoritos"}
                        </span>
                    </button>
                    <button
                        className="notion-sidebar-item w-full text-left text-destructive"
                        onClick={() => {
                            onDeleteDocument(contextMenu.doc);
                            setContextMenu(null);
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="notion-sidebar-item-title">Eliminar</span>
                    </button>
                </div>
            )}
        </>
    );
}
