import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toc: {
      insertToc: () => ReturnType;
    };
  }
}

export const TocExtension = Node.create({
  name: "toc",

  group: "block",

  atom: true,

  draggable: true,

  parseHTML() {
    return [
      {
        tag: "div[data-type='toc']",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div", 
      mergeAttributes(HTMLAttributes, { 
        "data-type": "toc", 
        class: "notion-toc my-4 p-4 rounded-lg bg-secondary/30 border border-border/50" 
      }),
      ["div", { class: "text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider" }, "Tabla de contenidos"],
      ["div", { class: "toc-content space-y-1" }, "Generando índice..."]
    ];
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      const container = document.createElement("div");
      container.className = "notion-toc my-4 p-4 rounded-lg bg-secondary/30 border border-border/50";
      
      const title = document.createElement("div");
      title.className = "text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider";
      title.innerText = "Tabla de contenidos";
      container.appendChild(title);

      const content = document.createElement("div");
      content.className = "toc-content space-y-1";
      container.appendChild(content);

      const updateToc = () => {
        content.innerHTML = "";
        const headings: { text: string; level: number; pos: number }[] = [];
        
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === "heading") {
            headings.push({
              text: node.textContent,
              level: node.attrs.level,
              pos,
            });
          }
        });

        if (headings.length === 0) {
          const empty = document.createElement("div");
          empty.className = "text-sm text-muted-foreground italic";
          empty.innerText = "Agrega encabezados para ver el índice";
          content.appendChild(empty);
          return;
        }

        headings.forEach((heading) => {
          const item = document.createElement("button");
          item.className = "block w-full text-left text-sm hover:underline transition-all";
          
          // Indentation based on level
          const indent = (heading.level - 1) * 12;
          item.style.paddingLeft = `${indent}px`;
          
          item.innerText = heading.text;
          item.onclick = (e) => {
            e.preventDefault();
            const element = editor.view.nodeDOM(heading.pos) as HTMLElement;
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              // Fallback: focus and move cursor
              editor.chain().focus().setTextSelection(heading.pos).run();
            }
          };
          content.appendChild(item);
        });
      };

      // Initial render
      updateToc();

      // Update on document changes
      const onUpdate = () => {
        updateToc();
      };
      
      editor.on("update", onUpdate);

      return {
        dom: container,
        destroy: () => {
          editor.off("update", onUpdate);
        },
      };
    };
  },

  addCommands() {
    return {
      insertToc:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    } as any;
  },
});
