import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MathNodeView } from './MathNodeView';

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /**
       * Set a math node
       */
      setMath: (attributes: { formula: string }) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathOptions>({
  name: 'math',

  group: 'inline',

  inline: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      formula: {
        default: '',
        parseHTML: element => element.getAttribute('data-formula'),
        renderHTML: attributes => ({
          'data-formula': attributes.formula,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-formula]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'notion-math-node',
      }),
      node.attrs.formula,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addCommands() {
    return {
      setMath:
        attributes =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs: attributes }).run();
        },
    };
  },
});
