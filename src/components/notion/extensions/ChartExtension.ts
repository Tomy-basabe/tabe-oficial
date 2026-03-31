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
        type?: string, 
        data?: any[],
        title?: string,
        colors?: string[],
        functions?: { expr: string; color: string; label: string }[],
        xRange?: [number, number],
        yRange?: [number, number],
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
        default: 'Nuevo Gráfico',
      },
      colors: {
        default: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981'],
      },
      functions: {
        default: [
          { expr: 'sin(x)', color: '#8b5cf6', label: 'f(x)' },
        ],
      },
      xRange: {
        default: [-10, 10],
      },
      yRange: {
        default: [-5, 5],
      },
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
