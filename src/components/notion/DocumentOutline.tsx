import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, Hash, ChevronRight, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extraer encabezados del DOM del editor
  const extractHeadings = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setHeadings([]);
      return;
    }

    const editorDom = editor.view?.dom;
    if (!editorDom) return;

    const headingEls = editorDom.querySelectorAll("h1, h2, h3");
    const items: HeadingItem[] = [];

    headingEls.forEach((el, index) => {
      const text = el.textContent?.trim();
      if (!text) return; // Omitir títulos vacíos

      const tag = el.tagName.toLowerCase();
      const level = tag === "h1" ? 1 : tag === "h2" ? 2 : 3;
      const id =
        el.id ||
        `tabe-heading-${index}-${text
          .slice(0, 20)
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase()}`;

      if (!el.id) {
        el.id = id;
      }

      items.push({
        id,
        text,
        level,
        element: el as HTMLElement,
      });
    });

    setHeadings(items);
  }, [editor]);

  // Actualizar encabezados ante cambios en el editor
  useEffect(() => {
    extractHeadings();

    if (!editor) return;

    const handleUpdate = () => {
      extractHeadings();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    // MutationObserver por si se renderizan nodos asíncronos
    const observer = new MutationObserver(() => {
      extractHeadings();
    });

    if (editor.view?.dom) {
      observer.observe(editor.view.dom, { childList: true, subtree: true });
    }

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
      observer.disconnect();
    };
  }, [editor, extractHeadings]);

  // Scroll spy para detectar encabezado visible actualmente
  useEffect(() => {
    const container = scrollContainerRef?.current || window;

    const handleScroll = () => {
      if (headings.length === 0) return;

      const containerTop = scrollContainerRef?.current
        ? scrollContainerRef.current.getBoundingClientRect().top
        : 0;

      let currentActive = headings[0].id;
      for (const item of headings) {
        const rect = item.element.getBoundingClientRect();
        // Umbral de detección según scroll relativo al contenedor
        if (rect.top - containerTop <= 140) {
          currentActive = item.id;
        } else {
          break;
        }
      }
      setActiveId(currentActive);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [headings, scrollContainerRef]);

  // Scroll suave al encabezado seleccionado
  const handleSelectHeading = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: "smooth", block: "start" });

    // Efecto visual de destello (highlight)
    element.classList.add("heading-target-highlight");
    setTimeout(() => {
      element.classList.remove("heading-target-highlight");
    }, 1500);
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  // Si no hay suficientes encabezados para justificar el minimap, no estorbar
  if (headings.length < 2) {
    return null;
  }

  return (
    <div
      className="hidden md:block absolute right-3 top-24 z-30 select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. MODO COLAPSADO: Barritas minimalistas estilo Notion con acento TABE */}
      <div
        className={cn(
          "transition-all duration-300 flex flex-col items-end gap-1.5 py-2.5 px-2 rounded-2xl cursor-pointer",
          "bg-background/85 dark:bg-card/85 backdrop-blur-md border-[2px] border-foreground/30 shadow-[2px_2px_0_0_hsl(var(--foreground)/0.2)]",
          "hover:border-foreground hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]",
          isHovered && "opacity-0 pointer-events-none scale-95"
        )}
        title="Índice del apunte (pasa el cursor para ver los temas)"
      >
        {headings.map((item) => {
          const isActive = activeId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "transition-all rounded-full duration-200",
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
          "transition-all duration-200 ease-out origin-top-right",
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

        {/* Lista jerárquica de encabezados */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-[50vh]">
          {headings.map((item) => {
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectHeading(item.element)}
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
