import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import TiptapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import BulletList from "@tiptap/extension-bullet-list";
import { wrappingInputRule, PasteRule } from "@tiptap/core";
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Link as LinkIcon,
  Highlighter, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";

import { SlashCommands } from "./extensions/SlashCommands";
import { Callout } from "./extensions/CalloutExtension";
import { Details, DetailsSummary, DetailsContent } from "./extensions/DetailsExtension";
import { DragHandle } from "./extensions/DragHandle";
import { TextStyle, Color, BackgroundColor } from "./extensions/ColorExtension";
import { Embed } from "./extensions/EmbedExtension";
import { ColumnBlock, Column } from "./extensions/ColumnsExtension";
import { Bookmark } from "./extensions/BookmarkExtension";
import { TocExtension } from "./extensions/TocExtension";
import { Indent } from "./extensions/IndentExtension";
import { ColorPicker } from "./ColorPicker";
import "tippy.js/dist/tippy.css";

const lowlight = createLowlight(common);

interface AdvancedNotionEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  placeholder?: string;
  documentId?: string;
}

// Bubble menu button
function BubbleBtn({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn("notion-bubble-btn", isActive && "active")}
    >
      {children}
    </button>
  );
}

export function AdvancedNotionEditor({
  content,
  onUpdate,
  placeholder = "Escribe '/' para ver comandos...",
  documentId,
}: AdvancedNotionEditorProps) {
  const lastLoadedDocumentIdRef = useRef<string | undefined>(documentId);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        bulletList: false, // Disable default to use custom one below
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: { class: "notion-bullet-list" },
      }).extend({
        addInputRules() {
          return [
            wrappingInputRule({
              find: /^\s*([*-+•])\s$/,
              type: this.type,
            }),
          ]
        },
        addPasteRules() {
          return [
            new PasteRule({
              find: /^\s*([*-+•])\s/gm,
              handler: ({ state, range, match }) => {
                const { tr } = state;
                const start = range.from;
                const end = range.to;
                tr.replaceWith(start, end, this.type.create());
                return tr;
              },
            }),
          ]
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Encabezado ${node.attrs.level}`;
          }
          return placeholder;
        },
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList.configure({
        HTMLAttributes: { class: "notion-task-list" },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "notion-task-item" },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      BackgroundColor,
      Typography,
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "notion-link" },
      }),
      TiptapImage.configure({
        HTMLAttributes: { class: "notion-image" },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "notion-table" },
      }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: "notion-code-block" },
      }),
      Callout,
      Details,
      DetailsSummary,
      DetailsContent,
      Embed,
      ColumnBlock,
      Column,
      Bookmark,
      TocExtension,
      Indent,
      DragHandle,
      SlashCommands,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "notion-editor-content prose dark:prose-invert max-w-none focus:outline-none min-h-[300px]",
      },
      transformPastedText(text) {
        // Just normalize some characters, handlePaste will do the heavy lifting
        return text.replace(/\r/g, '').trim();
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // If it's short or already has double newlines, let Tiptap handle it normally
        if (text.length < 10 || text.includes('\n\n')) return false;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) return false;

        // Heuristic to detect and fix PDF/Word line breaks
        let blocks: { type: 'p' | 'li', content: string }[] = [];
        
        lines.forEach(line => {
          // Detect bullet points
          const bulletMatch = line.match(/^[•●○◦▪■*-]\s*(.*)/);
          if (bulletMatch) {
            blocks.push({ type: 'li', content: bulletMatch[1] });
          } else {
            const lastBlock = blocks[blocks.length - 1];
            // If the last block was a paragraph and didn't end with a terminator,
            // or if this line starts with a lowercase letter, merge it.
            const endsWithTerminator = lastBlock && /[.:!?]$/.test(lastBlock.content);
            const startsWithLowercase = /^[a-záéíóú]/.test(line);

            if (lastBlock && lastBlock.type === 'p' && (!endsWithTerminator || startsWithLowercase)) {
              lastBlock.content += ' ' + line;
            } else {
              blocks.push({ type: 'p', content: line });
            }
          }
        });

        // Generate HTML to insert
        let htmlSnippet = '';
        let inList = false;

        blocks.forEach(block => {
          if (block.type === 'li') {
            if (!inList) {
              htmlSnippet += '<ul class="notion-bullet-list">';
              inList = true;
            }
            htmlSnippet += `<li><p>${block.content}</p></li>`;
          } else {
            if (inList) {
              htmlSnippet += '</ul>';
              inList = false;
            }
            htmlSnippet += `<p>${block.content}</p>`;
          }
        });
        if (inList) htmlSnippet += '</ul>';

        if (htmlSnippet) {
          view.dispatch(view.state.tr.deleteSelection());
          editor?.commands.insertContent(htmlSnippet);
          return true;
        }

        return false;
      }
    },
  });

  // Load content when document changes
  useEffect(() => {
    const shouldReload = documentId && documentId !== lastLoadedDocumentIdRef.current;
    if (!shouldReload || !editor || !content) return;
    lastLoadedDocumentIdRef.current = documentId;
    editor.commands.setContent(content);
  }, [documentId, content, editor]);

  // === Keyboard shortcuts (Notion-style) ===
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // === BLOCK TYPE SHORTCUTS (Ctrl+Shift+Number) ===
      if (modKey && e.shiftKey) {
        switch (e.key) {
          case "0":
            e.preventDefault();
            editor.chain().focus().setParagraph().run();
            return;
          case "1":
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            return;
          case "2":
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            return;
          case "3":
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            return;
          case "4":
            e.preventDefault();
            editor.chain().focus().toggleTaskList().run();
            return;
          case "5":
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
            return;
          case "6":
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
            return;
          case "7":
            e.preventDefault();
            editor.commands.setDetails();
            return;
          case "8":
            e.preventDefault();
            editor.chain().focus().toggleCodeBlock().run();
            return;
          case "9":
            e.preventDefault();
            editor.chain().focus().toggleBlockquote().run();
            return;
        }

        // Strikethrough: Ctrl+Shift+S
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          editor.chain().focus().toggleStrike().run();
          return;
        }
        // Highlight: Ctrl+Shift+H
        if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          editor.chain().focus().toggleHighlight().run();
          return;
        }
        // Move block up: Ctrl+Shift+ArrowUp
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const { $from } = editor.state.selection;
          const blockPos = $from.before($from.depth);
          if (blockPos > 0) {
            const resolvedBefore = editor.state.doc.resolve(blockPos);
            const blockBefore = resolvedBefore.nodeBefore;
            if (blockBefore) {
              const from = blockPos - blockBefore.nodeSize;
              const to = blockPos;
              const node = editor.state.doc.nodeAt(blockPos);
              if (node) {
                editor.chain()
                  .command(({ tr }) => {
                    const nodeSlice = editor.state.doc.slice(blockPos, blockPos + node.nodeSize);
                    tr.delete(blockPos, blockPos + node.nodeSize);
                    tr.insert(from, nodeSlice.content);
                    return true;
                  })
                  .focus()
                  .run();
              }
            }
          }
          return;
        }
        // Move block down: Ctrl+Shift+ArrowDown
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const { $from } = editor.state.selection;
          const blockPos = $from.before($from.depth);
          const node = editor.state.doc.nodeAt(blockPos);
          if (node) {
            const afterPos = blockPos + node.nodeSize;
            const resolvedAfter = editor.state.doc.resolve(afterPos);
            const blockAfter = resolvedAfter.nodeAfter;
            if (blockAfter) {
              editor.chain()
                .command(({ tr }) => {
                  const afterSlice = editor.state.doc.slice(afterPos, afterPos + blockAfter.nodeSize);
                  tr.delete(afterPos, afterPos + blockAfter.nodeSize);
                  tr.insert(blockPos, afterSlice.content);
                  return true;
                })
                .focus()
                .run();
            }
          }
          return;
        }
        // Alignment: Ctrl+Shift+L
        if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          editor.chain().focus().setTextAlign("left").run();
          return;
        }
        // Alignment: Ctrl+Shift+E (center)
        if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          editor.chain().focus().setTextAlign("center").run();
          return;
        }
        // Alignment: Ctrl+Shift+R
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          editor.chain().focus().setTextAlign("right").run();
          return;
        }
      }

      // === TEXT FORMATTING (Ctrl+key) ===
      if (modKey && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
            return;
          case "i":
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
            return;
          case "u":
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
            return;
          case "e":
            e.preventDefault();
            editor.chain().focus().toggleCode().run();
            return;
          case "k": {
            e.preventDefault();
            const previousUrl = editor.getAttributes("link").href;
            const url = window.prompt("URL:", previousUrl);
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
            return;
          }
          case "d": {
            e.preventDefault();
            const { from, to } = editor.state.selection;
            const slice = editor.state.doc.slice(from, to);
            editor.chain().focus().insertContentAt(to, slice.content.toJSON()).run();
            return;
          }
        }
      }

      // === ESCAPE ===
      if (e.key === "Escape") {
        editor.commands.blur();
        return;
      }

      // === TAB / SHIFT+TAB ===
      if (e.key === "Tab") {
        e.preventDefault();
        
        if (e.shiftKey) {
          // Priority: Lists/Tasks, then regular indentation
          if (editor.can().liftListItem("listItem")) {
            editor.chain().focus().liftListItem("listItem").run();
          } else if (editor.can().liftListItem("taskItem")) {
            editor.chain().focus().liftListItem("taskItem").run();
          } else {
            editor.commands.outdent();
          }
        } else {
          // Priority: Lists/Tasks, then regular indentation
          if (editor.can().sinkListItem("listItem")) {
            editor.chain().focus().sinkListItem("listItem").run();
          } else if (editor.can().sinkListItem("taskItem")) {
            editor.chain().focus().sinkListItem("taskItem").run();
          } else {
            editor.commands.indent();
          }
        }
        return;
      }

      // === MARKDOWN-STYLE SHORTCUTS ===
      if (e.key === " " && !modKey) {
        const { $from } = editor.state.selection;
        const textBefore = $from.nodeBefore?.textContent || "";

        if (textBefore === "#") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setHeading({ level: 1 }).run();
        } else if (textBefore === "##") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 2, to: $from.pos }).setHeading({ level: 2 }).run();
        } else if (textBefore === "###") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 3, to: $from.pos }).setHeading({ level: 3 }).run();
        } else if (textBefore === "-" || textBefore === "*" || textBefore === "+" || textBefore === "•") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).toggleBulletList().run();
        } else if (/^[1-9]\.$/.test(textBefore)) {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 2, to: $from.pos }).toggleOrderedList().run();
        } else if (textBefore === "[]" || textBefore === "[ ]") {
          e.preventDefault();
          const len = textBefore.length;
          editor.chain().focus().deleteRange({ from: $from.pos - len, to: $from.pos }).toggleTaskList().run();
        } else if (textBefore === '"') {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setBlockquote().run();
        } else if (textBefore === "---" || textBefore === "***") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 3, to: $from.pos }).setHorizontalRule().run();
        }
      }

      // === ENTER - triple backtick / > toggle ===
      if (e.key === "Enter" && !modKey && !e.shiftKey) {
        const { $from } = editor.state.selection;
        const textBefore = $from.nodeBefore?.textContent || "";

        if (textBefore === "```" || textBefore.endsWith("```")) {
          e.preventDefault();
          const len = textBefore.endsWith("```") ? 3 : textBefore.length;
          editor.chain().focus().deleteRange({ from: $from.pos - len, to: $from.pos }).toggleCodeBlock().run();
          return;
        }

        if (textBefore === ">") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setDetails().run();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  // Link helper
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="notion-advanced-editor">
      {/* Bubble Menu — appears on text selection, like real Notion */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="notion-bubble-menu"
      >
        {/* Block type quick toggles */}
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Encabezado 1"
        >
          <Heading1 className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Encabezado 2"
        >
          <Heading2 className="w-4 h-4" />
        </BubbleBtn>

        <div className="notion-bubble-separator" />

        {/* Text formatting */}
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Subrayado (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Código (Ctrl+E)"
        >
          <Code className="w-4 h-4" />
        </BubbleBtn>

        <div className="notion-bubble-separator" />

        <BubbleBtn
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          title="Resaltar"
        >
          <Highlighter className="w-4 h-4" />
        </BubbleBtn>

        <ColorPicker editor={editor} type="bubble" />

        <div className="notion-bubble-separator" />

        <BubbleBtn onClick={setLink} isActive={editor.isActive("link")} title="Enlace (Ctrl+K)">
          <LinkIcon className="w-4 h-4" />
        </BubbleBtn>

        <div className="notion-bubble-separator" />

        {/* Alignment */}
        <BubbleBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Izquierda"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Centro"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Derecha"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </BubbleBtn>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Remaining inline styles for callouts, details, drag, embeds — kept for compatibility */}
      <style>{`
        /* Callout */
        .callout {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 4px;
          margin: 4px 0;
        }

        .callout-icon { font-size: 1.25rem; flex-shrink: 0; }
        .callout-content { flex: 1; min-width: 0; }
        .callout-content p:last-child { margin-bottom: 0; }

        .callout-info { background: hsl(210 100% 50% / 0.08); border-left: 3px solid hsl(210 100% 50%); }
        .callout-success { background: hsl(142 76% 36% / 0.08); border-left: 3px solid hsl(142 76% 36%); }
        .callout-warning { background: hsl(45 100% 50% / 0.08); border-left: 3px solid hsl(45 100% 50%); }
        .callout-danger { background: hsl(0 84% 60% / 0.08); border-left: 3px solid hsl(0 84% 60%); }
        .callout-tip { background: hsl(270 76% 60% / 0.08); border-left: 3px solid hsl(270 76% 60%); }

        /* Details/Toggle */
        .notion-details { margin: 4px 0; }
        .notion-details-wrapper { display: contents; }
        .notion-details-summary {
          padding: 4px 0;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          user-select: none;
          list-style: none;
        }
        .notion-details-summary::marker,
        .notion-details-summary::-webkit-details-marker { display: none; }
        .notion-details-summary::before {
          content: '▶';
          font-size: 10px;
          transition: transform 120ms ease;
          flex-shrink: 0;
        }
        .notion-details[open] > .notion-details-wrapper > .notion-details-summary::before,
        .notion-details[open] > summary.notion-details-summary::before {
          transform: rotate(90deg);
        }
        .notion-details-content { padding-left: 22px; }

        /* Drag Handle */
        .drag-handle {
          position: fixed;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease;
          cursor: grab;
          padding: 4px;
          border-radius: 4px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          z-index: 50;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .drag-handle:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
        .drag-handle.show { opacity: 1; }
        .drag-handle:active, .drag-handle.dragging { cursor: grabbing; background: hsl(var(--primary) / 0.15); }

        .ProseMirror.dragging { cursor: grabbing; }
        .ProseMirror.dragging > * { pointer-events: none; }
        .ProseMirror.dragging .ProseMirror-selectednode { opacity: 0.4; }

        /* Slash menu tippy overrides */
        .tippy-box { background: transparent !important; border: none !important; box-shadow: none !important; }
        .tippy-content { padding: 0 !important; }

        .slash-menu { animation: slideIn 0.15s ease-out; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Selection */
        .notion-editor-content .ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          border-radius: 3px;
        }

        .notion-editor-content [style*="background-color"] {
          padding: 0 0.2em;
          border-radius: 3px;
        }

        /* Embeds */
        .embed-container { margin: 8px 0; border-radius: 4px; overflow: hidden; background: hsl(var(--secondary)); position: relative; }
        .embed-container iframe { display: block; border: none; }
        .embed-youtube, .embed-vimeo, .embed-loom { aspect-ratio: 16/9; }
        .embed-spotify { aspect-ratio: 80/21; min-height: 80px; }
        .embed-figma { aspect-ratio: 4/3; min-height: 400px; }
        .embed-codepen { aspect-ratio: 16/9; min-height: 300px; }
        .embed-twitter { padding: 1rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }
        .embed-generic { aspect-ratio: 16/9; min-height: 300px; }
      `}</style>
    </div>
  );
}
