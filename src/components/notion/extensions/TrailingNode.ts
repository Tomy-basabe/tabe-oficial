import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Extension that ensures there's always an empty paragraph at the very end
 * of the document so you can click below blocks like details/toggles.
 */
export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addOptions() {
    return {
      node: 'paragraph',
    };
  },

  addProseMirrorPlugins() {
    const plugin = new PluginKey(this.name);
    const { node: nodeName } = this.options;

    return [
      new Plugin({
        key: plugin,
        appendTransaction: (_, __, state) => {
          const { tr, schema, doc } = state;
          
          if (!doc || !schema || !schema.nodes[nodeName]) {
             return null;
          }

          // Check the last node of the document
          const lastChild = doc.lastChild;

          // If there's no last child or the last child is not a paragraph,
          // then we want to inject an empty paragraph at the end.
          if (lastChild && lastChild.type.name !== nodeName) {
             const type = schema.nodes[nodeName];
             if (type) {
                return tr.insert(doc.content.size, type.create());
             }
          }

          return null;
        },
      }),
    ];
  },
});
