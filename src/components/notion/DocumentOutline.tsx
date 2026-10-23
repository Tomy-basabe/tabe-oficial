import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeadingItem {
  index: number;
  text: string;
  level: number;
  pos: number;
  isClosed: boolean;
}

interface DocumentOutlineProps {
  editor: Editor | null;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  editor,
  scrollContainerRef,
}) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem("tabe_notion_outline_pinned") === "true";
    } catch {
      return false;
    }
  });

  const extractDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const currentHeadingsRef = useRef<HeadingItem[]>([]);

  // 1. Extraer encabezados del documento
  const extractHeadings = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      if (currentHeadingsRef.current.length > 0) {
        currentHeadingsRef.current = [];
        setHeadings([]);
      }
      return;
    }

    const items: HeadingItem[] = [];
    let count = 0;

    try {
      const { doc } = editor.state;
      doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const text = node.textContent?.trim();
          if (text) {
            let isClosed = false;
            try {
              const $pos = doc.resolve(pos);
              for (let d = $pos.depth; d > 0; d--) {
                const ancestor = $pos.node(d);
                if (ancestor.type.name === "details" && !ancestor.attrs.open) {
                  isClosed = true;
                  break;
                }
              }
            } catch {
              // fallback
            }

            items.push({
              index: count++,
              text,
              level: node.attrs.level || 1,
              pos,
              isClosed,
            });
          }
        }
      });
    } catch {
      return;
    }

    const prev = currentHeadingsRef.current;
    if (
      prev.length === items.length &&
      prev.every(
        (p, i) =>
          p.text === items[i].text &&
          p.level === items[i].level &&
          p.isClosed === items[i].isClosed
      )
    ) {
      return;
    }

    currentHeadingsRef.current = items;
    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    extractHeadings();

    if (!editor) return;

    const handleUpdate = () => {
      if (extractDebounceRef.current) {
        clearTimeout(extractDebounceRef.current);
      }
      extractDebounceRef.current = setTimeout(() => {
        extractHeadings();
      }, 400);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (extractDebounceRef.current) {
        clearTimeout(extractDebounceRef.current);
      }
    };
  }, [editor, extractHeadings]);

  // 2. Scroll spy para saber qué encabezado está en pantalla
  useEffect(() => {
    const container =
      scrollContainerRef?.current ||
      document.querySelector(".notion-editor-wrapper") ||
      window;
    if (!container) return;

    const checkScrollSpy = () => {
      if (headings.length === 0) return;

      const editorDom = editor?.view?.dom;
      if (!editorDom) return;

      const domHeadings = editorDom.querySelectorAll("h1, h2, h3");
      if (domHeadings.length === 0) return;

      const containerTop =
        container instanceof HTMLElement ? container.getBoundingClientRect().top : 0;

      let foundIndex = 0;
      for (let i = 0; i < domHeadings.length; i++) {
        const el = domHeadings[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top - containerTop <= 160) {
          foundIndex = i;
        } else {
          break;
        }
      }

      setActiveIndex(foundIndex);
    };

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 100) return;
      lastScrollTimeRef.current = now;

      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(checkScrollSpy);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [headings, scrollContainerRef, editor]);

  // 3. Scroll suave al encabezado seleccionado
  const handleSelectHeading = useCallback(
    (item: HeadingItem) => {
      if (!editor || editor.isDestroyed) return;
      setActiveIndex(item.index);

      const editorDom = editor.view?.dom;
      if (!editorDom) return;

      const domHeadings = editorDom.querySelectorAll("h1, h2, h3");
      const targetEl = domHeadings[item.index] as HTMLElement;
      if (!targetEl) return;

      // Abrir toggle si estaba dentro de un detalle cerrado
      let cur: HTMLElement | null = targetEl.parentElement;
      while (cur && cur !== editorDom) {
        if (cur.tagName.toLowerCase() === "details") {
          const details = cur as HTMLDetailsElement;
          if (!details.open) details.open = true;
        }
        cur = cur.parentElement;
      }

      const container =
        scrollContainerRef?.current ||
        (document.querySelector(".notion-doc-container") as HTMLElement) ||
        (document.querySelector(".notion-editor-area") as HTMLElement);

      if (container && container.scrollTo) {
        const cRect = container.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        const scrollOffset = tRect.top - cRect.top + container.scrollTop - 80;
        container.scrollTo({ top: Math.max(0, scrollOffset), behavior: "smooth" });
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Flash sutil de destino
      targetEl.classList.remove("heading-target-highlight");
      void targetEl.offsetWidth;
      targetEl.classList.add("heading-target-highlight");
      setTimeout(() => targetEl.classList.remove("heading-target-highlight"), 1600);
    },
    [editor, scrollContainerRef]
  );

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      localStorage.setItem("tabe_notion_outline_pinned", String(next));
    } catch {}
  };

  if (headings.length === 0) return null;

  const isVisible = isOpen || isPinned;

  return (
    <div className="fixed right-4 top-24 z-30 select-none print:hidden">
      {/* Botón flotante sutil estilo Notion */}
      {!isVisible && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-background/85 hover:bg-muted/90 backdrop-blur-md shadow-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="Abrir tabla de contenidos / Esquema"
        >
          <AlignLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[11px] font-medium hidden sm:inline">Esquema</span>
          <span className="text-[10px] font-mono px-1 rounded bg-muted text-muted-foreground">
            {headings.length}
          </span>
        </button>
      )}

      {/* Panel de Esquema estilo Notion (Limpio, profesional, sin bordes pesados) */}
      {isVisible && (
        <div
          className={cn(
            "w-64 max-h-[calc(100vh-140px)] flex flex-col rounded-xl border border-border/50 bg-background/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md shadow-xl transition-all duration-150 animate-in fade-in slide-in-from-right-2",
            isPinned ? "ring-1 ring-primary/30" : ""
          )}
        >
          {/* Header del panel */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Esquema
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({headings.length})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePin}
                className={cn(
                  "p-1 rounded-md transition-colors cursor-pointer",
                  isPinned
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={isPinned ? "Desanclar esquema (flotante)" : "Fijar esquema (permanente)"}
              >
                <Pin className={cn("w-3.5 h-3.5 transition-transform", isPinned && "rotate-45 text-primary fill-current")} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPinned(false);
                  try {
                    localStorage.setItem("tabe_notion_outline_pinned", "false");
                  } catch {}
                  setIsOpen(false);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Cerrar esquema"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de encabezados estilo Notion (#, ##, ###) */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[420px] custom-scrollbar">
            {headings.map((item) => {
              const isActive = activeIndex === item.index;

              return (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => handleSelectHeading(item)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1 flex items-center gap-2 text-xs transition-colors cursor-pointer group",
                    item.level === 1 && "pl-2 font-medium text-foreground",
                    item.level === 2 && "pl-4 text-muted-foreground hover:text-foreground",
                    item.level === 3 && "pl-6 text-muted-foreground/80 hover:text-foreground text-[11px]",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "hover:bg-muted/60 text-muted-foreground"
                  )}
                  title={item.text}
                >
                  {/* Prefijo jerárquico solo (# / ## / ###) */}
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-tight shrink-0 select-none",
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground/50 group-hover:text-muted-foreground"
                    )}
                  >
                    {item.level === 1 ? "#" : item.level === 2 ? "##" : "###"}
                  </span>

                  <span className="truncate flex-1">{item.text}</span>

                  {item.isClosed && (
                    <span className="text-[9px] text-muted-foreground/60 shrink-0 font-mono">
                      &gt;
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
