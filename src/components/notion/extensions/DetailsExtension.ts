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

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { empty, $from } = this.editor.state.selection;

        if (!empty) {
          return false;
        }

        // Si estamos al principio del título del Toggle (detailsSummary)
        if ($from.parent.type.name === 'detailsSummary' && $from.parentOffset === 0) {
          let detailsDepth = 0;
          for (let i = $from.depth; i > 0; i--) {
            if ($from.node(i).type.name === this.name) {
              detailsDepth = i;
              break;
            }
          }

          if (detailsDepth > 0) {
            const pos = $from.before(detailsDepth);
            const detailsNode = $from.node(detailsDepth);
            
            const summaryNode = detailsNode.child(0);
            const contentNode = detailsNode.child(1);

            const replacement: any[] = [];
            
            // Convertir el resumen en un párrafo normal
            replacement.push({
              type: 'paragraph',
              content: summaryNode.toJSON().content || []
            });

            // Extraer el contenido interior
            const contentJSON = contentNode.toJSON().content;
            if (contentJSON && Array.isArray(contentJSON)) {
               // Filtrar si es solo el párrafo vacío por defecto para no ensuciar
               const isSingleEmptyText = contentJSON.length === 1 && contentJSON[0].type === 'paragraph' && !contentJSON[0].content;
               if (!isSingleEmptyText) {
                 replacement.push(...contentJSON);
               }
            }

            // Desmontar el details e insertar el bloque desarmado
            this.editor.chain()
              .deleteRange({ from: pos, to: pos + detailsNode.nodeSize })
              .insertContentAt(pos, replacement)
              .setTextSelection(pos)
              .run();

            return true;
          }
        }

        return false;
      },
    };
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
