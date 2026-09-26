import React, { useEffect, useState, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { RemoteCursor } from "@/hooks/useNotionCollab";

interface RemoteCursorsOverlayProps {
  editor: Editor | null;
  remoteCursors: Record<string, RemoteCursor>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  currentPageId?: string;
}

interface RenderedCursor {
  userId: string;
  name: string;
  color: string;
  left: number;
  top: number;
  height: number;
}

export const RemoteCursorsOverlay: React.FC<RemoteCursorsOverlayProps> = ({
  editor,
  remoteCursors,
  containerRef,
  currentPageId,
}) => {
  const [renderedCursors, setRenderedCursors] = useState<RenderedCursor[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const calculatePositions = useCallback(() => {
    if (!editor || !editor.view || editor.isDestroyed) {
      setRenderedCursors([]);
      return;
    }

    const now = Date.now();
    const activeCursors = Object.values(remoteCursors).filter(
      (c) => (now - c.updatedAt < 35000) && (!currentPageId || !c.pageId || c.pageId === currentPageId)
    );

    if (activeCursors.length === 0) {
      setRenderedCursors([]);
      return;
    }

    const parentEl = containerRef?.current || editor.view.dom.parentElement;
    if (!parentEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const docSize = editor.state.doc.content.size;

    const computed: RenderedCursor[] = [];

    for (const c of activeCursors) {
      try {
        const clampedPos = Math.max(0, Math.min(c.pos, docSize));
        const coords = editor.view.coordsAtPos(clampedPos);
        if (!coords) continue;

        // Coordenadas relativas al contenedor del editor
        const left = coords.left - parentRect.left + (parentEl.scrollLeft || 0);
        const top = coords.top - parentRect.top + (parentEl.scrollTop || 0);
        const height = Math.max(16, coords.bottom - coords.top || 20);

        computed.push({
          userId: c.userId,
          name: c.name,
          color: c.color,
          left,
          top,
          height,
        });
      } catch {
        // Posición de documento inválida o fuera de vista
      }
    }

    setRenderedCursors(computed);
  }, [editor, remoteCursors, containerRef]);

  // Recalcular posiciones ante cambios de cursor, scroll, resize o transacciones del editor
  useEffect(() => {
    if (!editor) return;

    const scheduleUpdate = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(calculatePositions);
    };

    scheduleUpdate();

    editor.on("transaction", scheduleUpdate);
    editor.on("selectionUpdate", scheduleUpdate);

    const scrollEl = containerRef?.current || window;
    scrollEl.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      editor.off("transaction", scheduleUpdate);
      editor.off("selectionUpdate", scheduleUpdate);
      scrollEl.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [editor, calculatePositions, containerRef]);

  if (renderedCursors.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible z-30"
      aria-hidden="true"
    >
      {renderedCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none transition-all duration-100 ease-out will-change-transform"
          style={{
            transform: `translate3d(${cursor.left}px, ${cursor.top}px, 0)`,
          }}
        >
          {/* Línea vertical del cursor animada */}
          <div
            className="w-[2.5px] rounded-full animate-pulse shadow-sm"
            style={{
              height: `${cursor.height}px`,
              backgroundColor: cursor.color,
              boxShadow: `0 0 6px ${cursor.color}`,
            }}
          />

          {/* Etiqueta flotante con el nombre del usuario estilo Google Docs */}
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-[1px_1px_0_0_rgba(0,0,0,0.8)] border border-black/30 select-none uppercase tracking-wide flex items-center gap-1 leading-none"
            style={{ backgroundColor: cursor.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-ping inline-block" />
            <span>{cursor.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
