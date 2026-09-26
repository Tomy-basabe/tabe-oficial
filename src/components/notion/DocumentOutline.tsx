import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, ChevronRight, X, Bookmark } from "lucide-react";
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
  const [isPinned, setIsPinned] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const extractDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const currentHeadingsRef = useRef<HeadingItem[]>([]);

  // 1. Extraer encabezados de forma ultra liviana desde el árbol en memoria de Prosemirror
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

  // 2. Debounce estricto de 600ms ante cambios del editor
  useEffect(() => {
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
    const container = scrollContainerRef?.current || document.querySelector('.notion-editor-wrapper');
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

  // 4. Scroll suave al encabezado seleccionado con compensación de barra superior
  const handleSelectHeading = useCallback(
    (item: HeadingItem) => {
      if (!editor || editor.isDestroyed) return;
      setActiveIndex(item.index);

      const editorDom = editor.view?.dom;
      const domHeadings = editorDom?.querySelectorAll("h1, h2, h3");
      const targetEl = domHeadings && domHeadings[item.index]
        ? (domHeadings[item.index] as HTMLElement)
        : null;

      const container = (scrollContainerRef?.current ||
        document.querySelector('.notion-editor-wrapper') ||
        document.querySelector('.word-a4-page')) as HTMLElement | null;

      if (container && targetEl) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop - 90;
        container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
        targetEl.classList.add("heading-target-highlight");
        setTimeout(() => {
          targetEl.classList.remove("heading-target-highlight");
        }, 1500);
      } else if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        targetEl.classList.add("heading-target-highlight");
        setTimeout(() => {
          targetEl.classList.remove("heading-target-highlight");
        }, 1500);
      } else {
        editor.chain().setTextSelection(item.pos).scrollIntoView().run();
      }
    },
    [editor, scrollContainerRef]
  );

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  if (headings.length < 2) {
    return null;
  }

  const isExpanded = isHovered || isPinned;

  return (
    <div
      className="hidden md:block absolute right-3 top-24 z-30 select-none pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. MODO MINIMAP FLOTANTE (Sin caja ni encuadre rígido, barras de estilo comic directas) */}
      <div
        className={cn(
          "flex flex-col items-end gap-2 py-1 px-1 transition-all duration-200",
          isExpanded && "opacity-0 pointer-events-none scale-90 translate-x-2"
        )}
        aria-label="Índice minimap del apunte"
      >
        {headings.map((item) => {
          const isActive = activeIndex === item.index;
          return (
            <button
              key={item.index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectHeading(item);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectHeading(item);
                }
              }}
              title={item.text}
              className="group relative flex items-center justify-end py-0.5 cursor-pointer focus:outline-none"
            >
              {/* Tooltip comic flotante al pasar el mouse por cada barrita individual */}
              <span className="absolute right-7 px-2 py-0.5 rounded-md bg-card text-foreground font-black text-[10px] uppercase tracking-wider border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-40 max-w-[180px] truncate">
                {item.text}
              </span>

              {/* Barrita individual libre (sin encuadre) con acentos comic */}
              <span
                className={cn(
                  "block transition-all duration-150 rounded-full",
                  isActive
                    ? "bg-[#FFD700] border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] h-[5px] w-6 scale-110"
                    : item.level === 1
                    ? "bg-foreground/70 hover:bg-[#00E5FF] hover:border hover:border-foreground hover:scale-125 h-[4px] w-4"
                    : item.level === 2
                    ? "bg-foreground/45 hover:bg-[#BFFF00] hover:border hover:border-foreground hover:scale-125 h-[3px] w-3"
                    : "bg-foreground/30 hover:bg-foreground hover:scale-125 h-[2.5px] w-2"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* 2. MODO PANEL COMPLETO ESTILO COMIC PREMIUM (Sin blur borroso, fondo sólido, bordes nítidos y sombras duras) */}
      <div
        className={cn(
          "absolute right-0 top-0 w-72 max-w-[85vw] max-h-[70vh] flex flex-col",
          "bg-card rounded-2xl border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] p-3.5",
          "transition-all duration-200 ease-out origin-top-right",
          isExpanded
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Cabecera Comic */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b-[2.5px] border-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00E5FF] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center shrink-0">
              <AlignLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display font-black text-xs uppercase tracking-wider text-foreground block leading-tight">
                Índice
              </span>
              <span className="text-[9px] font-bold text-muted-foreground block">
                {headings.length} secciones
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={cn(
                "p-1.5 rounded-lg border-2 border-foreground transition-all",
                isPinned
                  ? "bg-[#FFD700] text-black shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={isPinned ? "Desanclar índice" : "Fijar índice"}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPinned(false);
                setIsHovered(false);
              }}
              className="p-1.5 rounded-lg border-2 border-foreground bg-card text-muted-foreground hover:text-foreground hover:bg-[#FF5C5C] hover:text-black transition-all"
              title="Cerrar índice"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Lista jerárquica de encabezados estilo Comic */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar max-h-[50vh]">
          {headings.map((item) => {
            const isActive = activeIndex === item.index;

            return (
              <button
                key={item.index}
                type="button"
                onClick={() => handleSelectHeading(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectHeading(item);
                  }
                }}
                className={cn(
                  "w-full text-left transition-all rounded-xl p-2 flex items-center gap-2 cursor-pointer border-2",
                  item.level === 1 && "pl-2 text-xs font-black",
                  item.level === 2 && "pl-4 text-[11px] font-bold",
                  item.level === 3 && "pl-6 text-[10px] font-semibold text-muted-foreground",
                  isActive
                    ? "bg-[#FFD700] text-black border-foreground shadow-[2.5px_2.5px_0_0_hsl(var(--foreground))] translate-x-1"
                    : "border-transparent bg-transparent hover:border-foreground hover:bg-secondary/70 hover:translate-x-1"
                )}
                title={`Saltar a: ${item.text}`}
              >
                {/* Badge Comic del Nivel (#, ##, ###) */}
                <span
                  className={cn(
                    "text-[9px] font-black font-mono shrink-0 select-none px-1.5 py-0.5 rounded border border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))]",
                    item.level === 1 && "bg-[#00E5FF] text-black",
                    item.level === 2 && "bg-[#BFFF00] text-black",
                    item.level === 3 && "bg-secondary text-foreground",
                    isActive && "bg-black text-[#FFD700] border-black shadow-none"
                  )}
                >
                  {item.level === 1 ? "#" : item.level === 2 ? "##" : "###"}
                </span>

                <span className="truncate flex-1 font-sans">{item.text}</span>

                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform stroke-[2.5]",
                    isActive
                      ? "opacity-100 text-black translate-x-0"
                      : "opacity-0 -translate-x-1"
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
