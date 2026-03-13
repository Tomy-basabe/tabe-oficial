/**
 * SubPage Extension for TipTap
 * Renders a clickeable sub-page block within the editor, similar to Notion's page links.
 */
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

  return (
    <NodeViewWrapper className="notion-subpage-wrapper" contentEditable={false}>
      <div
        className={`notion-subpage-block ${selected ? "selected" : ""}`}
        data-page-id={node.attrs.pageId}
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
    return ReactNodeViewRenderer(SubPageComponent);
  },
});
