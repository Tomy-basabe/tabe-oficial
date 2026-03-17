import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

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
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.className = 'notion-math-render';
      
      const renderFormula = () => {
        try {
          katex.render(node.attrs.formula || '?', dom, {
            throwOnError: false,
            displayMode: false,
          });
        } catch (e) {
          dom.textContent = node.attrs.formula;
        }
      };

      renderFormula();

      return {
        dom,
        update: updatedNode => {
          if (updatedNode.type.name !== this.name) return false;
          if (updatedNode.attrs.formula !== node.attrs.formula) {
            node.attrs.formula = updatedNode.attrs.formula;
            renderFormula();
          }
          return true;
        },
      };
    };
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
