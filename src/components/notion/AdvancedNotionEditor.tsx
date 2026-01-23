import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
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
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Image,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Table as TableIcon,
  Minus,
} from "lucide-react";

import { SlashCommands } from "./extensions/SlashCommands";
import { Callout } from "./extensions/CalloutExtension";
import { Details, DetailsSummary, DetailsContent } from "./extensions/DetailsExtension";
import { DragHandle } from "./extensions/DragHandle";
import { TextStyle, Color, BackgroundColor } from "./extensions/ColorExtension";
import { Embed } from "./extensions/EmbedExtension";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { ColorPicker } from "./ColorPicker";
import "tippy.js/dist/tippy.css";

const lowlight = createLowlight(common);

interface AdvancedNotionEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  placeholder?: string;
  documentId?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        isActive
          ? "bg-primary/20 text-primary"
          : "hover:bg-secondary text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
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
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
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
        HTMLAttributes: {
          class: "notion-task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "notion-task-item",
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      BackgroundColor,
      Typography,
      TiptapUnderline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "notion-link",
        },
      }),
      TiptapImage.configure({
        HTMLAttributes: {
          class: "notion-image",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "notion-table",
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "notion-code-block",
        },
      }),
      Callout,
      Details,
      DetailsSummary,
      DetailsContent,
      Embed,
      DragHandle,
      SlashCommands,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "notion-editor-content prose dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
      },
    },
  });

  // Load content when document changes
  useEffect(() => {
    const shouldReload = documentId && documentId !== lastLoadedDocumentIdRef.current;
    if (!shouldReload || !editor || !content) return;

    lastLoadedDocumentIdRef.current = documentId;
    editor.commands.setContent(content);
  }, [documentId, content, editor]);

  // Notion-style keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      const optionKey = isMac ? e.altKey : e.shiftKey;
      
      // ===== BLOCK TYPE SHORTCUTS (Cmd/Ctrl + Option/Shift + Number) =====
      if (modKey && (isMac ? e.altKey : e.shiftKey)) {
        switch (e.key) {
          case '0':
            e.preventDefault();
            editor.chain().focus().setParagraph().run();
            return;
          case '1':
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            return;
          case '2':
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            return;
          case '3':
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            return;
          case '4':
            e.preventDefault();
            editor.chain().focus().toggleTaskList().run();
            return;
          case '5':
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
            return;
          case '6':
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
            return;
          case '7':
            e.preventDefault();
            editor.commands.setDetails();
            return;
          case '8':
            e.preventDefault();
            editor.chain().focus().toggleCodeBlock().run();
            return;
          case '9':
            e.preventDefault();
            editor.chain().focus().toggleBlockquote().run();
            return;
        }
      }

      // ===== TEXT FORMATTING SHORTCUTS =====
      if (modKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
            return;
          case 'i':
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
            return;
          case 'u':
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
            return;
          case 'e':
            e.preventDefault();
            editor.chain().focus().toggleCode().run();
            return;
          case 'k':
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
          case 'd':
            // Duplicate block (Cmd+D)
            e.preventDefault();
            const { from, to } = editor.state.selection;
            const content = editor.state.doc.slice(from, to);
            editor.chain().focus().insertContentAt(to, content.content.toJSON()).run();
            return;
        }
        
        // Strikethrough: Cmd+Shift+S
        if (e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          editor.chain().focus().toggleStrike().run();
          return;
        }
        
        // Highlight: Cmd+Shift+H
        if (e.shiftKey && e.key.toLowerCase() === 'h') {
          e.preventDefault();
          editor.chain().focus().toggleHighlight().run();
          return;
        }
      }

      // ===== BLOCK NAVIGATION & EDITING =====
      // Escape to select block
      if (e.key === 'Escape') {
        editor.commands.blur();
        return;
      }

      // Tab to indent, Shift+Tab to outdent
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          editor.chain().focus().liftListItem('listItem').run() ||
          editor.chain().focus().liftListItem('taskItem').run();
        } else {
          editor.chain().focus().sinkListItem('listItem').run() ||
          editor.chain().focus().sinkListItem('taskItem').run();
        }
        return;
      }

      // Move blocks up/down with Cmd+Shift+Arrow
      if (modKey && e.shiftKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Move block up - TipTap doesn't have this built-in, but we can try lift
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Move block down
          return;
        }
      }

      // ===== MARKDOWN-STYLE SHORTCUTS (on space after pattern) =====
      if (e.key === " " && !modKey) {
        const { $from } = editor.state.selection;
        const textBefore = $from.nodeBefore?.textContent || "";
        
        // Auto-convert markdown patterns
        if (textBefore === "#") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setHeading({ level: 1 }).run();
        } else if (textBefore === "##") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 2, to: $from.pos }).setHeading({ level: 2 }).run();
        } else if (textBefore === "###") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 3, to: $from.pos }).setHeading({ level: 3 }).run();
        } else if (textBefore === "-" || textBefore === "*" || textBefore === "+") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).toggleBulletList().run();
        } else if (/^[1-9]\.$/.test(textBefore) || textBefore === "a." || textBefore === "i.") {
          e.preventDefault();
          const len = textBefore.length;
          editor.chain().focus().deleteRange({ from: $from.pos - len, to: $from.pos }).toggleOrderedList().run();
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

      // ===== ENTER SHORTCUTS (``` for code, > for toggle) =====
      if (e.key === "Enter" && !modKey && !e.shiftKey) {
        const { $from } = editor.state.selection;
        const textBefore = $from.nodeBefore?.textContent || "";
        
        // Triple backticks -> code block
        if (textBefore === "```" || textBefore.endsWith("```")) {
          e.preventDefault();
          const backtickLen = textBefore.length >= 3 ? (textBefore.endsWith("```") ? 3 : textBefore.length) : 3;
          const deleteFrom = $from.pos - backtickLen;
          editor.chain().focus().deleteRange({ from: deleteFrom, to: $from.pos }).toggleCodeBlock().run();
          return;
        }
        
        // > at start of line -> toggle block
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

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL de la imagen:");

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="notion-advanced-editor">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border p-2 flex flex-wrap items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Encabezado 1 (Ctrl+Alt+1)"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Encabezado 2 (Ctrl+Alt+2)"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Encabezado 3 (Ctrl+Alt+3)"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Subrayado (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Tachado (Ctrl+Shift+S)"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Código inline (Ctrl+E)"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Resaltar (Ctrl+Shift+H)"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
          <ColorPicker editor={editor} type="toolbar" />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Lista con viñetas (Ctrl+Shift+5)"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Lista numerada (Ctrl+Shift+6)"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            title="Lista de tareas (Ctrl+Shift+4)"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Blocks */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Cita"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divisor"
          >
            <Minus className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Alinear izquierda"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Centrar"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Alinear derecha"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Media */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border">
          <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Enlace (Ctrl+K)">
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Imagen">
            <Image className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={insertTable} title="Tabla">
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Help */}
        <div className="flex items-center gap-0.5 px-2">
          <KeyboardShortcutsHelp />
        </div>
      </div>

      {/* Bubble Menu (selection formatting) */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-card border border-border rounded-lg shadow-xl p-1 flex items-center gap-0.5"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
        >
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
        <ColorPicker editor={editor} type="bubble" />
        <ToolbarButton onClick={setLink} isActive={editor.isActive("link")}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Editor Styles */}
      <style>{`
        .notion-advanced-editor {
          position: relative;
        }

        .notion-editor-content {
          padding: 2rem 1rem;
        }

        .notion-editor-content .ProseMirror {
          outline: none;
        }

        /* Placeholder */
        .notion-editor-content .is-editor-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }

        .notion-editor-content .is-node-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }

        /* Headings */
        .notion-editor-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .notion-editor-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .notion-editor-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        /* Paragraphs */
        .notion-editor-content p {
          margin-bottom: 0.5rem;
          line-height: 1.8;
        }

        /* Lists - with visible bullets and numbers */
        .notion-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .notion-editor-content ul ul {
          list-style-type: circle;
        }

        .notion-editor-content ul ul ul {
          list-style-type: square;
        }

        .notion-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .notion-editor-content li {
          margin-bottom: 0.25rem;
        }

        .notion-editor-content li::marker {
          color: hsl(var(--foreground));
        }

        /* Task List */
        .notion-task-list {
          list-style: none;
          padding-left: 0;
        }

        .notion-task-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .notion-task-item label {
          display: flex;
          align-items: center;
        }

        .notion-task-item input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          border: 2px solid hsl(var(--border));
          background: hsl(var(--secondary));
          cursor: pointer;
          appearance: none;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .notion-task-item input[type="checkbox"]:checked {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }

        .notion-task-item input[type="checkbox"]:checked::after {
          content: "✓";
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .notion-task-item[data-checked="true"] > div {
          text-decoration: line-through;
          opacity: 0.6;
        }

        /* Blockquote */
        .notion-editor-content blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        /* Code Block */
        .notion-code-block {
          background: hsl(var(--secondary));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 0.875rem;
          overflow-x: auto;
        }

        .notion-code-block code {
          background: none;
          padding: 0;
        }

        /* Inline code */
        .notion-editor-content code {
          background: hsl(var(--secondary));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 0.9em;
        }

        /* Link */
        .notion-link {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }

        /* Image */
        .notion-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        /* Table */
        .notion-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        .notion-table td,
        .notion-table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          min-width: 100px;
        }

        .notion-table th {
          background: hsl(var(--secondary));
          font-weight: 600;
        }

        /* Horizontal Rule */
        .notion-editor-content hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5rem 0;
        }

        /* Highlight */
        .notion-editor-content mark {
          background: hsl(var(--neon-gold) / 0.3);
          padding: 0.1rem 0.2rem;
          border-radius: 0.25rem;
        }

        /* Callout */
        .callout {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        .callout-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .callout-content {
          flex: 1;
          min-width: 0;
        }

        .callout-content p:last-child {
          margin-bottom: 0;
        }

        .callout-info {
          background: hsl(210 100% 50% / 0.1);
          border: 1px solid hsl(210 100% 50% / 0.3);
        }

        .callout-success {
          background: hsl(142 76% 36% / 0.1);
          border: 1px solid hsl(142 76% 36% / 0.3);
        }

        .callout-warning {
          background: hsl(45 100% 50% / 0.1);
          border: 1px solid hsl(45 100% 50% / 0.3);
        }

        .callout-danger {
          background: hsl(0 84% 60% / 0.1);
          border: 1px solid hsl(0 84% 60% / 0.3);
        }

        .callout-tip {
          background: hsl(270 76% 60% / 0.1);
          border: 1px solid hsl(270 76% 60% / 0.3);
        }

        /* Details/Toggle */
        .notion-details {
          margin: 1rem 0;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          overflow: visible;
        }

        .notion-details-wrapper {
          display: contents;
        }

        .notion-details-summary {
          padding: 0.75rem 1rem;
          background: hsl(var(--secondary));
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          user-select: none;
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .notion-details:not([open]) .notion-details-summary {
          border-radius: 0.5rem;
        }

        .notion-details-summary::marker,
        .notion-details-summary::-webkit-details-marker {
          display: none;
        }

        .notion-details-summary::before {
          content: '▶';
          font-size: 0.7rem;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .notion-details[open] > .notion-details-wrapper > .notion-details-summary::before,
        .notion-details[open] > summary.notion-details-summary::before {
          transform: rotate(90deg);
        }

        .notion-details-content {
          padding: 1rem;
          border-top: 1px solid hsl(var(--border));
        }

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

        .drag-handle:hover {
          background: hsl(var(--secondary));
          color: hsl(var(--foreground));
          border-color: hsl(var(--primary) / 0.3);
        }

        .drag-handle.show {
          opacity: 1;
        }

        .drag-handle:active,
        .drag-handle.dragging {
          cursor: grabbing;
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }

        .ProseMirror.dragging {
          cursor: grabbing;
        }

        .ProseMirror.dragging > * {
          pointer-events: none;
        }

        .ProseMirror.dragging .ProseMirror-selectednode {
          opacity: 0.4;
          background: hsl(var(--primary) / 0.1);
          border-radius: 4px;
        }

        /* Drop Indicator */
        .drop-indicator {
          position: fixed;
          height: 3px;
          background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6));
          border-radius: 2px;
          z-index: 100;
          pointer-events: none;
          display: none;
          box-shadow: 0 0 12px hsl(var(--primary) / 0.5);
        }

        /* Slash Commands Menu */
        .tippy-box {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .tippy-content {
          padding: 0 !important;
        }

        .slash-menu {
          animation: slideIn 0.15s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Selection */
        .notion-editor-content .ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          border-radius: 0.25rem;
        }

        /* Text colors will be handled inline */
        .notion-editor-content [style*="background-color"] {
          padding: 0 0.2em;
          border-radius: 0.25rem;
        }

        /* Embeds */
        .embed-container {
          margin: 1rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: hsl(var(--secondary));
          position: relative;
        }

        .embed-container iframe {
          display: block;
          border: none;
        }

        .embed-youtube,
        .embed-vimeo,
        .embed-loom {
          aspect-ratio: 16/9;
        }

        .embed-spotify {
          aspect-ratio: 80/21;
          min-height: 80px;
        }

        .embed-figma {
          aspect-ratio: 4/3;
          min-height: 400px;
        }

        .embed-codepen {
          aspect-ratio: 16/9;
          min-height: 300px;
        }

        .embed-twitter {
          padding: 1rem;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
        }

        .embed-twitter blockquote {
          margin: 0;
          font-style: normal;
          border-left: none;
          padding-left: 0;
        }

        .embed-twitter a {
          color: hsl(var(--primary));
          text-decoration: none;
        }

        .embed-twitter a:hover {
          text-decoration: underline;
        }

        .embed-generic {
          aspect-ratio: 16/9;
          min-height: 300px;
        }

        /* Draggable embeds */
        .embed-container[draggable="true"] {
          cursor: grab;
        }

        .embed-container:hover::after {
          content: '';
          position: absolute;
          inset: 0;
          background: hsl(var(--primary) / 0.05);
          pointer-events: none;
          border-radius: inherit;
        }
      `}</style>
    </div>
  );
}
