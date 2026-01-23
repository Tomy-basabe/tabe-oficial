import { Node, mergeAttributes } from "@tiptap/core";

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
        ({ commands, chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: "detailsSummary",
                  content: [{ type: "text", text: "Toggle" }],
                },
                {
                  type: "detailsContent",
                  content: [{ type: "paragraph" }],
                },
              ],
            })
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

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("details");
      dom.className = "notion-details";
      
      // Preserve open state through re-renders
      dom.open = true;

      const contentDOM = document.createElement("div");
      contentDOM.className = "notion-details-wrapper";

      dom.appendChild(contentDOM);

      // Handle toggle clicks properly
      dom.addEventListener("toggle", (e) => {
        e.stopPropagation();
      });

      return {
        dom,
        contentDOM,
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
    return ["summary", mergeAttributes(HTMLAttributes, { class: "notion-details-summary" }), 0];
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
