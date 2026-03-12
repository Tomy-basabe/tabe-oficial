import { Node, mergeAttributes, nodeViewProps } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(node.attrs.width || "100%");

  useEffect(() => {
    setWidth(node.attrs.width || "100%");
  }, [node.attrs.width]);

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setResizing(true);

    const startX = event.clientX;
    const startWidth = imageRef.current?.clientWidth || 0;
    const parentWidth = imageRef.current?.parentElement?.clientWidth || 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diffX = currentX - startX;
      const newWidthPx = startWidth + diffX;
      const newWidthPercent = Math.max(10, Math.min(100, (newWidthPx / parentWidth) * 100));
      setWidth(`${newWidthPercent}%`);
    };

    const onMouseUp = () => {
      setResizing(false);
      updateAttributes({ width });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [updateAttributes, width]);

  return (
    <NodeViewWrapper className={cn("notion-resizable-image-container", selected && "ProseMirror-selectednode")}>
      <div className="relative inline-block group" style={{ width }}>
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          className="notion-resizable-image block w-full h-auto rounded-md transition-shadow"
        />
        
        {/* Resize handle */}
        <div
          onMouseDown={onMouseDown}
          className={cn(
            "absolute bottom-2 right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg active:scale-125 z-20",
            resizing && "opacity-100 scale-125"
          )}
        >
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
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
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
