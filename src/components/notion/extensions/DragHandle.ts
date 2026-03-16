import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DragHandleOptions {
  dragHandleWidth: number;
}

function getDraggableNodeAtCoords(coords: { x: number; y: number }, view: any) {
  const result = view.posAtCoords(coords);
  if (!result) return null;

  const { pos } = result;
  const $pos = view.state.doc.resolve(pos);

  // Traverse up the document tree to find the most appropriate draggable block
  let targetNode = null;
  let targetPos = null;

  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d);

    if (node.isBlock) {
      // Skip non-draggable structural nodes
      if (node.type.name === 'detailsSummary' || node.type.name === 'detailsContent') {
        continue; // We want to target the parent 'details' block instead
      }
      
      if (node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'taskList') {
        continue; // We want to target the listItem/taskItem instead of the list wrapper
      }

      // If we find a paragraph inside a list item, we prefer to drag the list item
      if (node.type.name === 'paragraph') {
        const parentNode = $pos.node(d - 1);
        if (parentNode && (parentNode.type.name === 'listItem' || parentNode.type.name === 'taskItem')) {
          continue; // Defer to the list item wrapper
        }
      }

      targetNode = node;
      targetPos = $pos.before(d);
      break;
    }
  }

  if (targetNode && targetPos !== null) {
    try {
      const dom = view.nodeDOM(targetPos);
      if (dom && dom instanceof Element) {
        return { node: targetNode, pos: targetPos, dom };
      }
    } catch {
      return null;
    }
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
    let lastHoveredNode: Element | null = null;

    const createDragHandle = () => {
      const handle = document.createElement("div");
      handle.draggable = true;
      handle.dataset.dragHandle = "";
      handle.classList.add("drag-handle");
      handle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="16" height="16">
          <circle cx="2" cy="2" r="1.2" fill="currentColor"/>
          <circle cx="2" cy="5" r="1.2" fill="currentColor"/>
          <circle cx="2" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="6" cy="2" r="1.2" fill="currentColor"/>
          <circle cx="6" cy="5" r="1.2" fill="currentColor"/>
          <circle cx="6" cy="8" r="1.2" fill="currentColor"/>
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
              
              // Use our robust getter based on coordinates instead of DOM hacking
              const rect = currentNode.getBoundingClientRect();
              const draggable = getDraggableNodeAtCoords({ x: rect.left + 5, y: rect.top + 5 }, view);

              if (draggable && draggable.pos >= 0) {
                draggedNodePos = draggable.pos;
                const node = draggable.node;
                
                const selection = NodeSelection.create(view.state.doc, draggable.pos);
                view.dispatch(view.state.tr.setSelection(selection));
                
                // Set drag data
                e.dataTransfer?.setData("text/plain", "");
                e.dataTransfer!.effectAllowed = "move";
                
                // Create a subtle ghost image
                const ghost = document.createElement("div");
                ghost.style.cssText = "position:fixed;top:-1000px;left:-1000px;padding:8px 16px;background:hsl(var(--primary));color:white;border-radius:4px;font-size:14px;";
                ghost.textContent = "Moviendo bloque...";
                document.body.appendChild(ghost);
                e.dataTransfer?.setDragImage(ghost, 0, 0);
                requestAnimationFrame(() => ghost.remove());
              }
            }
          });

          // Handle drag end
          dragHandleElement.addEventListener("dragend", () => {
            view.dom.classList.remove("dragging");
            dragHandleElement?.classList.remove("dragging");
            draggedNodePos = null;
            lastHoveredNode = null;
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

              const draggable = getDraggableNodeAtCoords({ x: event.clientX, y: event.clientY }, view);

              if (!draggable || !dragHandleElement) {
                hideDragHandle();
                currentNode = null;
                return false;
              }

              // Avoid unnecessary updates
              if (draggable.dom === lastHoveredNode) return false;
              lastHoveredNode = draggable.dom;
              currentNode = draggable.dom;
              
              const rect = draggable.dom.getBoundingClientRect();
              const editorRect = view.dom.getBoundingClientRect();
              
              // Position handle to the left of the block
              const left = Math.max(editorRect.left - this.options.dragHandleWidth - 8, 8);
              const top = rect.top + 2;

              dragHandleElement.style.left = `${left}px`;
              dragHandleElement.style.top = `${top}px`;
              showDragHandle();

              return false;
            },
            mouseleave: () => {
              if (draggedNodePos === null) {
                hideDragHandle();
                lastHoveredNode = null;
              }
              return false;
            },
            dragover: (view, event) => {
              event.preventDefault();
              if (draggedNodePos === null || !dropIndicator) return false;
              
              const draggable = getDraggableNodeAtCoords({ x: event.clientX, y: event.clientY }, view);
              
              if (draggable && draggable.dom !== currentNode) {
                const targetNode = draggable.dom;
                const rect = targetNode.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const position = event.clientY < midY ? "before" : "after";
                
                // Nesting detection: if mouse is significantly to the right of the block start
                const isNested = event.clientX > rect.left + 40;
                
                if (isNested && position === "after") {
                  dropIndicator.classList.add("nested");
                  const offset = 24; // Standard indentation
                  dropIndicator.style.setProperty("--nested-offset", `${rect.left}px`);
                } else {
                  dropIndicator.classList.remove("nested");
                }
                
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
              
              const isNested = dropIndicator?.classList.contains("nested");
              hideDropIndicator();
              
              if (draggedNodePos === null) return false;
              
              const draggable = getDraggableNodeAtCoords({ x: event.clientX, y: event.clientY }, view);
              
              if (!draggable) {
                draggedNodePos = null;
                return false;
              }
              
              const targetPos = draggable.pos;
              if (targetPos == null) {
                draggedNodePos = null;
                return false;
              }
              
              const targetNode = draggable.dom;
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
              let insertPos: number;
              
              if (insertBefore) {
                insertPos = targetPos;
              } else {
                const targetNodeAtPos = view.state.doc.nodeAt(targetPos);
                insertPos = targetPos + (targetNodeAtPos?.nodeSize || 0);
              }
              
              // Create the transaction
              const tr = view.state.tr;
              
              // Delete original
              const deleteFrom = draggedNodePos;
              const deleteTo = draggedNodePos + draggedNode.nodeSize;
              tr.delete(deleteFrom, deleteTo);
              
              // Adjust insertPos if deletion happened before it
              const adjustedInsertPos = insertPos > deleteFrom ? insertPos - (deleteTo - deleteFrom) : insertPos;
              
              // Prepare node with potential indentation
              let nodeToInsert = draggedNode;
              if (isNested) {
                const targetNodeObj = view.state.doc.nodeAt(targetPos);
                if (targetNodeObj) {
                  const targetIndent = targetNodeObj.attrs.indent || 0;
                  // Only indent if the node type supports it (Indent extension must be present)
                  if (draggedNode.type.name === 'paragraph' || draggedNode.type.name === 'heading' || draggedNode.type.name === 'blockquote') {
                    nodeToInsert = draggedNode.type.create({
                      ...draggedNode.attrs,
                      indent: targetIndent + 1
                    }, draggedNode.content, draggedNode.marks);
                  }
                }
              } else if (!insertBefore) {
                // If moving AFTER and NOT nested, it should match the target's indentation
                const targetNodeObj = view.state.doc.nodeAt(targetPos);
                if (targetNodeObj && (draggedNode.type.name === 'paragraph' || draggedNode.type.name === 'heading' || draggedNode.type.name === 'blockquote')) {
                    nodeToInsert = draggedNode.type.create({
                      ...draggedNode.attrs,
                      indent: targetNodeObj.attrs.indent || 0
                    }, draggedNode.content, draggedNode.marks);
                }
              }
              
              tr.insert(adjustedInsertPos, nodeToInsert);
              
              view.dispatch(tr);
              
              draggedNodePos = null;
              lastHoveredNode = null;
              hideDragHandle();
              
              return true;
            },
          },
        },
      }),
    ];
  },
});
