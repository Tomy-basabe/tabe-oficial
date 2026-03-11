import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "success" | "warning" | "danger" | "tip";

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "block+",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-notion-type="callout"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type as CalloutType;
    const typeClasses: Record<CalloutType, string> = {
      info: "notion-callout-info",
      success: "notion-callout-success",
      warning: "notion-callout-warning",
      danger: "notion-callout-danger",
      tip: "notion-callout-tip",
    };

    const icons: Record<CalloutType, string> = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      danger: "🚫",
      tip: "💡",
    };

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-notion-type": "callout",
        class: `notion-callout ${typeClasses[type]}`,
      }),
      ["span", { class: "notion-callout-icon", contenteditable: "false" }, icons[type]],
      ["div", { class: "notion-callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCallout(),
    };
  },
});
