import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeadingItem {
  index: number;
  text: string;
  level: number;
  pos: number;
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
  const [isHovered, setIsHovered] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const extractDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const currentHeadingsRef = useRef<HeadingItem[]>([]);

  // 1. Extraer encabezados de forma ultra liviana desde el árbol en memoria de Prosemirror
  // CERO consultas al DOM, CERO reflows, CERO MutationObserver. Toma < 0.2ms en documentos enormes.
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
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const text = node.textContent?.trim();
          if (text) {
            items.push({
              index: count++,
              text,
              level: node.attrs.level || 1,
              pos,
            });
          }
        }
      });
    } catch {
      return;
    }

    // Evitar renders innecesarios si la estructura no cambió
    const prev = currentHeadingsRef.current;
    if (
      prev.length === items.length &&
      prev.every((p, i) => p.text === items[i].text && p.level === items[i].level)
    ) {
      return;
    }

    currentHeadingsRef.current = items;
    setHeadings(items);
  }, [editor]);

  // 2. Debounce estricto de 600ms ante cambios del editor (NUNCA en selectionUpdate)
  useEffect(() => {
    // Extracción inicial inmediata
    extractHeadings();

    if (!editor) return;

    const handleUpdate = () => {
      if (extractDebounceRef.current) {
        clearTimeout(extractDebounceRef.current);
      }
      extractDebounceRef.current = setTimeout(() => {
        extractHeadings();
      }, 600);
    };

    // SOLO escuchar 'update' con debounce para no competir con el tecleo
    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      if (extractDebounceRef.current) {
        clearTimeout(extractDebounceRef.current);
      }
    };
  }, [editor, extractHeadings]);

  // 3. Scroll spy de alto rendimiento con throttle + requestAnimationFrame
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const checkScrollSpy = () => {
      if (headings.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const editorDom = editor?.view?.dom;
      if (!editorDom) return;

      const domHeadings = editorDom.querySelectorAll("h1, h2, h3");
      if (domHeadings.length === 0) return;

      let foundIndex = 0;
      for (let i = 0; i < domHeadings.length; i++) {
        const el = domHeadings[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top - containerRect.top <= 160) {
          foundIndex = i;
        } else {
          break;
        }
      }

      setActiveIndex(foundIndex);
    };

    const handleScroll = () => {
      const now = Date.now();
      // Throttle de 120ms para no saturar durante scrolls rápidos
      if (now - lastScrollTimeRef.current < 120) {
        return;
      }
      lastScrollTimeRef.current = now;

      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
      scrollRafRef.current = requestAnimationFrame(() => {
        checkScrollSpy();
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [headings, scrollContainerRef, editor]);

  // 4. Scroll suave al encabezado seleccionado
  const handleSelectHeading = useCallback(
    (item: HeadingItem) => {
      if (!editor || editor.isDestroyed) return;

      const editorDom = editor.view?.dom;
      const domHeadings = editorDom?.querySelectorAll("h1, h2, h3");
      const targetEl = domHeadings && domHeadings[item.index]
        ? (domHeadings[item.index] as HTMLElement)
        : null;

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        targetEl.classList.add("heading-target-highlight");
        setTimeout(() => {
          targetEl.classList.remove("heading-target-highlight");
        }, 1500);
      } else {
        editor.chain().setTextSelection(item.pos).scrollIntoView().run();
      }
    },
    [editor]
  );

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // Si no hay suficientes encabezados, no renderizar nada
  if (headings.length < 2) {
    return null;
  }

  return (
    <div
      className="hidden md:block absolute right-3 top-24 z-30 select-none pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. MODO COLAPSADO: Barritas minimalistas estilo Notion con acento TABE */}
      <div
        className={cn(
          "transition-all duration-300 flex flex-col items-end gap-1.5 py-2.5 px-2 rounded-2xl cursor-pointer",
          "bg-background/80 dark:bg-card/80 backdrop-blur-md border-[2px] border-foreground/30 shadow-[2px_2px_0_0_hsl(var(--foreground)/0.2)]",
          "hover:border-foreground hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]",
          isHovered && "opacity-0 pointer-events-none scale-95"
        )}
        title="Índice del apunte (pasa el cursor para ver los temas)"
      >
        {headings.map((item) => {
          const isActive = activeIndex === item.index;
          return (
            <div
              key={item.index}
              className={cn(
                "transition-all rounded-full duration-150",
                item.level === 1 && "h-[3.5px]",
                item.level === 2 && "h-[2.5px]",
                item.level === 3 && "h-[2px]",
                isActive
                  ? "bg-primary w-5 shadow-[0_0_8px_hsl(var(--primary))]"
                  : item.level === 1
                  ? "w-4 bg-foreground/60 hover:bg-foreground"
                  : item.level === 2
                  ? "w-3 bg-foreground/40 hover:bg-foreground/80"
                  : "w-2 bg-foreground/25 hover:bg-foreground/60"
              )}
            />
          );
        })}
      </div>

      {/* 2. MODO EXPANDIDO: Panel Flotante Completo estilo TABE Neo-Brutalism */}
      <div
        className={cn(
          "absolute right-0 top-0 w-72 max-w-[85vw] max-h-[70vh] flex flex-col",
          "bg-card/95 dark:bg-[#121217]/95 backdrop-blur-md rounded-2xl",
          "border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] p-3.5",
          "transition-all duration-150 ease-out origin-top-right",
          isHovered
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Cabecera del Índice */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b-[2px] border-foreground/15">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/20 text-primary border border-primary/30">
              <AlignLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
              Índice del apunte
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary text-foreground border border-foreground/20">
            {headings.length} temas
          </span>
        </div>

        {/* Lista jerárquica de encabezados con scroll suave */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-[50vh]">
          {headings.map((item) => {
            const isActive = activeIndex === item.index;

            return (
              <button
                key={item.index}
                type="button"
                onClick={() => handleSelectHeading(item)}
                className={cn(
                  "w-full text-left transition-all rounded-lg flex items-center gap-1.5 group/item cursor-pointer",
                  item.level === 1 && "pl-2 py-1.5 text-xs font-black",
                  item.level === 2 && "pl-5 py-1 text-[11px] font-bold text-foreground/90",
                  item.level === 3 && "pl-8 py-0.5 text-[10px] font-medium text-muted-foreground",
                  isActive
                    ? "bg-primary/15 text-primary border-l-[3px] border-primary font-black shadow-xs"
                    : "hover:bg-primary/10 hover:text-primary hover:translate-x-0.5"
                )}
                title={`Ir a: ${item.text}`}
              >
                {/* Indicador de nivel (#, ##, ###) */}
                <span
                  className={cn(
                    "text-[9px] font-mono shrink-0 select-none opacity-40 group-hover/item:opacity-100",
                    isActive && "opacity-100 text-primary font-black"
                  )}
                >
                  {item.level === 1 ? "#" : item.level === 2 ? "##" : "###"}
                </span>

                <span className="truncate flex-1">{item.text}</span>

                <ChevronRight
                  className={cn(
                    "w-3 h-3 shrink-0 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all",
                    isActive && "opacity-100 translate-x-0 text-primary"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
