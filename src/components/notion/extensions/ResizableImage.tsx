import { Node, mergeAttributes, NodeViewProps } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(node.attrs.width || "100%");
  const align = node.attrs.align || "center";

  useEffect(() => {
    setWidth(node.attrs.width || "100%");
  }, [node.attrs.width]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent, direction: "left" | "right") => {
      event.preventDefault();
      event.stopPropagation();
      setResizing(true);

      const startX = event.clientX;
      const startWidth = imageRef.current?.clientWidth || 0;
      // relative to the editor container width for stable percentages
      const editorWidth = imageRef.current?.closest(".ProseMirror")?.clientWidth || 800;

      const onMouseMove = (moveEvent: MouseEvent) => {
        let diffX = moveEvent.clientX - startX;
        
        // Dragging left handle outward means negative diff, which means width increases.
        if (direction === "left") {
          diffX = -diffX;
        }

        const newWidthPx = startWidth + diffX * 2; // multiply by 2 if centered?
        
        // If center aligned, pulling one edge expands both sides (in standard block display), so diff is effectively doubled.
        // If floated left/right, it just grows in that direction.
        const effectiveDiff = align === "center" ? diffX * 2 : diffX;
        const finalWidthPx = startWidth + effectiveDiff;
        
        const newWidthPercent = Math.max(10, Math.min(100, (finalWidthPx / editorWidth) * 100));
        setWidth(`${newWidthPercent}%`);
      };

      const onMouseUp = () => {
        setResizing(false);
        // Persist the width
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
    [updateAttributes, align]
  );

  const containerStyle: React.CSSProperties = {
    width: align === "center" ? "100%" : "auto",
    display: align === "center" ? "flex" : "block",
    justifyContent: "center",
    float: align === "left" ? "left" : align === "right" ? "right" : "none",
    marginRight: align === "left" ? "1.5rem" : "0",
    marginLeft: align === "right" ? "1.5rem" : "0",
    marginBottom: align !== "center" ? "0.5rem" : "0",
    clear: align === "center" ? "both" : "none",
  };

  return (
    <NodeViewWrapper
      className={cn("notion-resizable-image-container", selected && "ProseMirror-selectednode")}
      style={containerStyle}
    >
      <div 
        className="relative inline-block group" 
        style={{ width: align === "center" ? width : width }}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          className="notion-resizable-image block max-w-full h-auto rounded-md transition-shadow"
          style={{ width: "100%" }}
        />
        
        {/* Right Resize handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, "right")}
          className={cn(
            "absolute top-0 right-0 w-4 -mr-2 h-full cursor-col-resize opacity-0 hover:opacity-100 flex items-center justify-center group-hover:opacity-100 transition-opacity z-20",
            resizing && "opacity-100"
          )}
        >
          <div className="w-1.5 h-12 bg-black/50 dark:bg-white/50 rounded-full shadow-sm" />
        </div>

        {/* Left Resize handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, "left")}
          className={cn(
            "absolute top-0 left-0 w-4 -ml-2 h-full cursor-col-resize opacity-0 hover:opacity-100 flex items-center justify-center group-hover:opacity-100 transition-opacity z-20",
            resizing && "opacity-100"
          )}
        >
          <div className="w-1.5 h-12 bg-black/50 dark:bg-white/50 rounded-full shadow-sm" />
        </div>
        
        {/* Selection overlay */}
        {selected && (
          <div className="absolute inset-0 ring-2 ring-primary ring-offset-2 rounded-md pointer-events-none" />
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
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
