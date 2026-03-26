/**
 * SubPage Extension for TipTap
 * Renders a clickeable sub-page block within the editor, similar to Notion's page links.
 */
import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { FileText, ChevronRight } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subPage: {
      insertSubPage: (attrs: { title: string; pageId: string | null }) => ReturnType;
    };
  }
}

// React component for the sub-page block
const SubPageComponent = ({ node, updateAttributes, selected }: any) => {
  const title = node.attrs.title || "Sin título";
  const pageId = node.attrs.pageId;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Listen for the creation event to update this block's pageId
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Match by title if this block has no pageId yet
      if (!node.attrs.pageId && detail?.oldTitle === node.attrs.title && detail?.newPageId) {
        updateAttributes({ pageId: detail.newPageId });
      }
    };
    document.addEventListener("notion-subpage-created", handler);
    return () => document.removeEventListener("notion-subpage-created", handler);
  }, [node.attrs.pageId, node.attrs.title, updateAttributes]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const event = new CustomEvent("notion-subpage-click", {
        detail: { pageId: node.attrs.pageId, title },
        bubbles: true,
      });
      document.dispatchEvent(event);
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [node.attrs.pageId, title]);

  return (
    <NodeViewWrapper className="notion-subpage-wrapper" contentEditable={false}>
      <div
        ref={containerRef}
        className={`notion-subpage-block ${selected ? "selected" : ""}`}
        data-page-id={pageId}
      >
        <FileText className="notion-subpage-icon" />
        <span className="notion-subpage-title">{title}</span>
        <ChevronRight className="notion-subpage-arrow" />
      </div>
    </NodeViewWrapper>
  );
};

export const SubPage = Node.create({
  name: "subPage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "Sub-página",
        parseHTML: (element) => element.getAttribute("data-title") || "Sub-página",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id"),
        renderHTML: (attributes) => ({ "data-page-id": attributes.pageId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sub-page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "sub-page",
        class: "notion-subpage-block",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertSubPage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SubPageComponent, {
      contentDOMElementTag: 'div',
      stopEvent: ({ event }) => {
        // Prevent ProseMirror from handling clicks on this node view, allowing the React onClick handler to take over
        if (event.type === 'click' || event.type === 'mousedown' || event.type === 'pointerdown') {
          return true;
        }
        return false;
      }
    });
  },
});
