import { Node, mergeAttributes, NodeViewProps } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Move } from "lucide-react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(node.attrs.width || "100%");
  const align = node.attrs.align || "center";
  const isFloating = node.attrs.isFloating || false;
  const position = node.attrs.position || { x: 0, y: 0 };

  useEffect(() => {
    setWidth(node.attrs.width || "100%");
  }, [node.attrs.width]);

  const onResizeStart = useCallback(
    (event: React.MouseEvent, direction: "left" | "right") => {
      event.preventDefault();
      event.stopPropagation();
      setResizing(true);

      const startX = event.clientX;
      const startWidth = imageRef.current?.clientWidth || 0;
      const editorWidth = imageRef.current?.closest(".ProseMirror")?.clientWidth || 800;

      const onMouseMove = (moveEvent: MouseEvent) => {
        let diffX = moveEvent.clientX - startX;
        
        if (direction === "left") {
          diffX = -diffX;
        }

        const effectiveDiff = align === "center" && !isFloating ? diffX * 2 : diffX;
        const finalWidthPx = startWidth + effectiveDiff;
        
        const newWidthPercent = Math.max(10, Math.min(100, (finalWidthPx / editorWidth) * 100));
        setWidth(`${newWidthPercent}%`);
      };

      const onMouseUp = () => {
        setResizing(false);
        setWidth((currentWidth) => {
          updateAttributes({ width: currentWidth });
          return currentWidth;
        });
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [updateAttributes, align, isFloating]
  );

  const onDragStart = useCallback((event: React.MouseEvent) => {
    if (!isFloating) return;
    
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);

    const startX = event.clientX - position.x;
    const startY = event.clientY - position.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      
      if (containerRef.current) {
        containerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const onMouseUp = (moveEvent: MouseEvent) => {
      setDragging(false);
      const finalX = moveEvent.clientX - startX;
      const finalY = moveEvent.clientY - startY;
      
      updateAttributes({ 
        position: { x: finalX, y: finalY } 
      });

      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [isFloating, position, updateAttributes]);

  const containerStyle: React.CSSProperties = {
    width: (align === "full" || align === "center" || align === "left-block" || align === "right-block") && !isFloating ? "100%" : "auto",
    display: (align === "center" || align === "left-block" || align === "right-block") && !isFloating ? "flex" : "block",
    justifyContent: align === "center" ? "center" : align === "right-block" ? "flex-end" : "flex-start",
    float: isFloating ? "none" : (align === "left" ? "left" : align === "right" ? "right" : "none"),
    marginRight: !isFloating && align === "left" ? "1.5rem" : "0",
    marginLeft: !isFloating && align === "right" ? "1.5rem" : "0",
    marginTop: !isFloating && (align === "center" || align === "left-block" || align === "right-block" || align === "full") ? "1.5rem" : "0",
    marginBottom: !isFloating && (align === "center" || align === "left-block" || align === "right-block" || align === "full") ? "1.5rem" : "0.5rem",
    clear: !isFloating && (align === "center" || align === "left-block" || align === "right-block" || align === "full") ? "both" : "none",
    position: isFloating ? "absolute" : "relative",
    left: isFloating ? 0 : undefined,
    top: isFloating ? 0 : undefined,
    transform: isFloating ? `translate(${position.x}px, ${position.y}px)` : undefined,
    zIndex: isFloating ? 50 : 0,
    cursor: isFloating ? (dragging ? "grabbing" : "default") : "default",
    transition: dragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const imageStyle: React.CSSProperties = {
    width: align === "full" ? "100%" : width,
    height: "auto",
    maxWidth: "100%",
    cursor: !isFloating ? "pointer" : "default",
    transition: "box-shadow 0.2s, ring 0.2s",
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn(
        "notion-resizable-image-container", 
        selected && "ProseMirror-selectednode",
        isFloating && "shadow-xl ring-1 ring-black/5 dark:ring-white/10"
      )}
      style={containerStyle}
      onMouseDown={onDragStart}
    >
      <div 
        className="relative inline-block group" 
        style={{ width: (align === "center" || align === "left-block" || align === "right-block" || isFloating) ? width : width }}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          className={cn(
            "notion-resizable-image transition-all duration-200",
            isFloating && "rounded-lg shadow-2xl ring-2 ring-primary/20",
            !isFloating && "rounded-sm"
          )}
          style={imageStyle}
        />

        {/* Floating Move Handle - ONLY shows when floating is ON */}
        {isFloating && (
          <div 
            className="absolute -top-3 -left-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing z-30 animate-in zoom-in-50 duration-200 hover:scale-110 transition-transform"
            title="Arrastra para mover"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e as any);
            }}
          >
            <Move className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Resize handles - Show when selected (works in both float and normal modes) */}
        {selected && (
          <>
            <div
              onMouseDown={(e) => onResizeStart(e, "left")}
              className={cn(
                "absolute top-0 left-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center",
                resizing && "opacity-100"
              )}
            >
              <div className="w-1 h-12 bg-primary/30 rounded-full" />
            </div>
            <div
              onMouseDown={(e) => onResizeStart(e, "right")}
              className={cn(
                "absolute top-0 right-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center",
                resizing && "opacity-100"
              )}
            >
              <div className="w-1 h-12 bg-primary/30 rounded-full" />
            </div>
          </>
        )}

        {/* Selection ring */}
        {selected && !isFloating && (
          <div className="absolute inset-0 ring-2 ring-primary/40 ring-offset-1 rounded-sm pointer-events-none z-10" />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        renderHTML: (attributes) => ({
          style: `width: ${attributes.width}`,
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
      isFloating: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-floating") === "true",
        renderHTML: (attributes) => ({
          "data-floating": attributes.isFloating,
        }),
      },
      position: {
        default: { x: 0, y: 0 },
        parseHTML: (element) => {
          const x = parseInt(element.getAttribute("data-x") || "0");
          const y = parseInt(element.getAttribute("data-y") || "0");
          return { x, y };
        },
        renderHTML: (attributes) => ({
          "data-x": attributes.position.x,
          "data-y": attributes.position.y,
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
