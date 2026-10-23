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
      setMath: (attributes: { formula?: string; latex?: string }) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathOptions>({
  name: 'math',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      formula: {
        default: '',
        parseHTML: element => element.getAttribute('data-formula') || element.getAttribute('data-latex') || '',
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
      {
        tag: 'span[data-latex]',
      },
      {
        tag: 'span.notion-math-node',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'notion-math-node',
        'data-formula': node.attrs.formula,
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
          const formula = attributes.formula ?? attributes.latex ?? 'E = mc^2';
          return chain().insertContent({ type: this.name, attrs: { formula } }).run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-m': () => {
        const { state, commands } = this.editor;
        const { from, to } = state.selection;
        const isRange = from !== to;
        const selectedText = isRange ? state.doc.textBetween(from, to, ' ').trim() : '';

        const success = commands.insertContent({
          type: this.name,
          attrs: { formula: selectedText || 'E = mc^2' },
        });

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('notion-trigger-math-edit'));
        }, 50);

        return success;
      },
    };
  },
});
