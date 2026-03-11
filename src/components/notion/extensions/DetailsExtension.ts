import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

export interface DetailsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    details: {
      setDetails: () => ReturnType;
      toggleDetails: () => ReturnType;
      unsetDetails: () => ReturnType;
    };
  }
}

export const Details = Node.create<DetailsOptions>({
  name: "details",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "detailsSummary detailsContent",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: element => element.hasAttribute('open'),
        renderHTML: attributes => {
          if (attributes.open) {
            return { open: '' }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "details",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "notion-details",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                {
                  type: "detailsSummary",
                  content: [], // Empty summary so user sees placeholder
                },
                {
                  type: "detailsContent",
                  content: [{ type: "paragraph" }],
                },
              ],
            })
            // Focus on the summary we just created
            .focus()
            .run();
        },
      toggleDetails:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
      unsetDetails:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^[>]\s$/,
        type: this.type,
        getAttributes: () => ({ open: true }),
      }),
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("details");
      dom.className = "notion-details";
      
      if (node.attrs.open) {
        dom.open = true;
      }

      dom.addEventListener("toggle", (e) => {
        if (typeof getPos === 'function') {
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(getPos(), undefined, {
              ...node.attrs,
              open: dom.open,
            })
            return true
          })
        }
      });

      return {
        dom,
        contentDOM: dom,
        ignoreMutation: (mutation: MutationRecord) => {
          return mutation.type === "attributes" && mutation.attributeName === "open";
        },
      };
    };
  },
});

export const DetailsSummary = Node.create({
  name: "detailsSummary",

  content: "inline*",

  defining: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes, { 
      class: "notion-details-summary",
      "data-placeholder": "Mazo (Toggle)" 
    }), 0];
  },
});

export const DetailsContent = Node.create({
  name: "detailsContent",

  content: "block+",

  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="details-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "details-content",
        class: "notion-details-content",
      }),
      0,
    ];
  },
});
