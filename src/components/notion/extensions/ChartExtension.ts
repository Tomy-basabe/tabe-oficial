import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ChartComponent } from './ChartComponent';

export interface ChartOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      /**
       * Add a chart node
       */
      setChart: (attributes: { 
        type: 'bar' | 'line' | 'pie', 
        data: any[],
        title?: string
      }) => ReturnType;
    };
  }
}

export const ChartExtension = Node.create<ChartOptions>({
  name: 'chart',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'bar',
      },
      data: {
        default: [
          { name: 'A', value: 400 },
          { name: 'B', value: 300 },
          { name: 'C', value: 200 },
          { name: 'D', value: 278 },
        ],
      },
      title: {
        default: 'Nuevo Gráfico Estadístico',
      },
      colors: {
        default: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'],
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartComponent);
  },

  addCommands() {
    return {
      setChart:
        attributes =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs: attributes }).run();
        },
    };
  },
});
