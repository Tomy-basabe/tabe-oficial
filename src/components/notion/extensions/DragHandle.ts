import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DragHandleOptions {
  dragHandleWidth: number;
}

function absoluteRect(node: Element) {
  const data = node.getBoundingClientRect();
  return {
    top: data.top,
    left: data.left,
    width: data.width,
    height: data.height,
  };
}

function nodeDOMAtCoords(coords: { x: number; y: number }) {
  const elements = document.elementsFromPoint(coords.x, coords.y);
  
  for (const elem of elements) {
    // Check if it's a direct child of ProseMirror or matches specific block types
    if (
      elem.parentElement?.matches?.(".ProseMirror") ||
      elem.matches(
        [
          "li",
          "p",
          "pre",
          "blockquote",
          "h1, h2, h3, h4, h5, h6",
          "[data-type]",
          ".notion-details",
          ".callout",
          "table",
          ".notion-task-item",
        ].join(", ")
      )
    ) {
      return elem;
    }
  }
  return null;
}

function nodePosAtDOM(node: Element, view: any) {
  const boundingRect = node.getBoundingClientRect();
  const result = view.posAtCoords({
    left: boundingRect.left + 1,
    top: boundingRect.top + 1,
  });
  return result?.inside ?? result?.pos;
}

function getNodeAtPos(doc: any, pos: number) {
  const $pos = doc.resolve(pos);
  // Get the parent node if we're inside inline content
  const depth = $pos.depth;
  for (let d = depth; d >= 0; d--) {
    const node = $pos.node(d);
    if (node.isBlock && !node.isTextblock) continue;
    if (node.isBlock) return { node, pos: $pos.before(d) };
  }
  return null;
}

export const DragHandle = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      dragHandleWidth: 24,
    };
  },

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLElement | null = null;
    let dropIndicator: HTMLElement | null = null;
    let currentNode: Element | null = null;
    let draggedNodePos: number | null = null;

    const createDragHandle = () => {
      const handle = document.createElement("div");
      handle.draggable = true;
      handle.dataset.dragHandle = "";
      handle.classList.add("drag-handle");
      handle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="14" height="14">
          <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="2" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="8" r="1.5" fill="currentColor"/>
        </svg>
      `;
      return handle;
    };

    const createDropIndicator = () => {
      const indicator = document.createElement("div");
      indicator.classList.add("drop-indicator");
      return indicator;
    };

    const showDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.classList.add("show");
      }
    };

    const hideDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.classList.remove("show");
      }
    };

    const showDropIndicator = (rect: DOMRect, position: "before" | "after") => {
      if (!dropIndicator) return;
      dropIndicator.style.display = "block";
      dropIndicator.style.left = `${rect.left}px`;
      dropIndicator.style.width = `${rect.width}px`;
      
      if (position === "before") {
        dropIndicator.style.top = `${rect.top - 2}px`;
      } else {
        dropIndicator.style.top = `${rect.bottom - 2}px`;
      }
    };

    const hideDropIndicator = () => {
      if (dropIndicator) {
        dropIndicator.style.display = "none";
      }
    };

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view: (view) => {
          dragHandleElement = createDragHandle();
          dropIndicator = createDropIndicator();
          
          // Handle drag start
          dragHandleElement.addEventListener("dragstart", (e) => {
            if (currentNode) {
              view.dom.classList.add("dragging");
              dragHandleElement?.classList.add("dragging");
              
              const nodePos = nodePosAtDOM(currentNode, view);
              if (nodePos != null && nodePos >= 0) {
                draggedNodePos = nodePos;
                const node = view.state.doc.nodeAt(nodePos);
                if (node) {
                  const selection = NodeSelection.create(view.state.doc, nodePos);
                  view.dispatch(view.state.tr.setSelection(selection));
                  
                  // Set drag data
                  e.dataTransfer?.setData("text/plain", "");
                  e.dataTransfer!.effectAllowed = "move";
                  
                  // Create ghost image
                  const ghost = currentNode.cloneNode(true) as HTMLElement;
                  ghost.style.opacity = "0.5";
                  ghost.style.position = "absolute";
                  ghost.style.top = "-1000px";
                  document.body.appendChild(ghost);
                  e.dataTransfer?.setDragImage(ghost, 0, 0);
                  setTimeout(() => ghost.remove(), 0);
                }
              }
            }
          });

          // Handle drag end
          dragHandleElement.addEventListener("dragend", () => {
            view.dom.classList.remove("dragging");
            dragHandleElement?.classList.remove("dragging");
            draggedNodePos = null;
            hideDragHandle();
            hideDropIndicator();
          });

          view.dom.parentElement?.appendChild(dragHandleElement);
          document.body.appendChild(dropIndicator);

          return {
            destroy: () => {
              dragHandleElement?.remove();
              dropIndicator?.remove();
              dragHandleElement = null;
              dropIndicator = null;
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) return false;
              
              // Don't show handle while dragging
              if (draggedNodePos !== null) return false;

              const node = nodeDOMAtCoords({
                x: event.clientX + 50 + this.options.dragHandleWidth,
                y: event.clientY,
              });

              if (!node || !dragHandleElement) {
                hideDragHandle();
                return false;
              }

              currentNode = node;
              const rect = absoluteRect(node);
              const left = rect.left - this.options.dragHandleWidth - 8;
              const top = rect.top + 4;

              dragHandleElement.style.left = `${left}px`;
              dragHandleElement.style.top = `${top}px`;
              showDragHandle();

              return false;
            },
            mouseleave: (view) => {
              if (draggedNodePos === null) {
                hideDragHandle();
              }
              return false;
            },
            dragover: (view, event) => {
              event.preventDefault();
              if (draggedNodePos === null) return false;
              
              const targetNode = nodeDOMAtCoords({
                x: event.clientX + 50,
                y: event.clientY,
              });
              
              if (targetNode && targetNode !== currentNode) {
                const rect = targetNode.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const position = event.clientY < midY ? "before" : "after";
                showDropIndicator(rect, position);
              } else {
                hideDropIndicator();
              }
              
              return false;
            },
            drop: (view, event) => {
              event.preventDefault();
              view.dom.classList.remove("dragging");
              dragHandleElement?.classList.remove("dragging");
              hideDropIndicator();
              
              if (draggedNodePos === null) return false;
              
              const targetNode = nodeDOMAtCoords({
                x: event.clientX + 50,
                y: event.clientY,
              });
              
              if (!targetNode) {
                draggedNodePos = null;
                return false;
              }
              
              const targetPos = nodePosAtDOM(targetNode, view);
              if (targetPos == null || targetPos === draggedNodePos) {
                draggedNodePos = null;
                return false;
              }
              
              const rect = targetNode.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              const insertBefore = event.clientY < midY;
              
              // Get the node we're dragging
              const draggedNode = view.state.doc.nodeAt(draggedNodePos);
              if (!draggedNode) {
                draggedNodePos = null;
                return false;
              }
              
              // Calculate new position
              const targetResolve = view.state.doc.resolve(targetPos);
              let insertPos: number;
              
              if (insertBefore) {
                insertPos = targetPos;
              } else {
                const targetNodeAtPos = view.state.doc.nodeAt(targetPos);
                insertPos = targetPos + (targetNodeAtPos?.nodeSize || 1);
              }
              
              // Adjust insert position if we're moving down
              if (draggedNodePos < insertPos) {
                insertPos -= draggedNode.nodeSize;
              }
              
              // Create the transaction
              const tr = view.state.tr;
              
              // Delete the original node
              tr.delete(draggedNodePos, draggedNodePos + draggedNode.nodeSize);
              
              // Calculate the adjusted insert position after deletion
              const adjustedPos = draggedNodePos < insertPos ? insertPos : insertPos;
              
              // Insert at new position
              tr.insert(adjustedPos, draggedNode);
              
              view.dispatch(tr);
              
              draggedNodePos = null;
              hideDragHandle();
              
              return true;
            },
          },
        },
      }),
    ];
  },
});
