import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Highlighter, List, ListOrdered, CheckSquare,
  Heading1, Heading2, Heading3, Quote, Minus, AlignLeft,
  AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo
} from "lucide-react";

interface NotionEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  placeholder?: string;
}

export function NotionEditor({ content, onUpdate, placeholder = "Escribe '/' para ver comandos..." }: NotionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full",
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none",
      },
    },
  });

  // Sync content from parent
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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

  if (!editor) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-secondary transition-colors",
        isActive && "bg-secondary text-primary"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="notion-editor">
      {/* Bubble Menu - aparece al seleccionar texto */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="bg-card border border-border rounded-lg shadow-xl p-1 flex items-center gap-0.5"
        >
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
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Tachado"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Código"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Resaltar"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive("link")}
            title="Enlace (Ctrl+K)"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
        </BubbleMenu>
      )}

      {/* Floating Menu - aparece en líneas vacías */}
      {editor && (
        <FloatingMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="bg-card border border-border rounded-lg shadow-xl p-2"
        >
          <div className="flex flex-col gap-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground px-2 py-1">Bloques básicos</p>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Heading1 className="w-4 h-4" />
              <span>Encabezado 1</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Heading2 className="w-4 h-4" />
              <span>Encabezado 2</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Heading3 className="w-4 h-4" />
              <span>Encabezado 3</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <List className="w-4 h-4" />
              <span>Lista con viñetas</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Lista numerada</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Lista de tareas</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Quote className="w-4 h-4" />
              <span>Cita</span>
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Minus className="w-4 h-4" />
              <span>Separador</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <Code className="w-4 h-4" />
              <span>Bloque de código</span>
            </button>
            <button
              onClick={addImage}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Imagen</span>
            </button>
          </div>
        </FloatingMenu>
      )}

      {/* Toolbar principal */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-card/50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Rehacer (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Encabezado 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Encabezado 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Encabezado 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
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
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          title="Resaltar"
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Lista de tareas"
        >
          <CheckSquare className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
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
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Cita"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Bloque de código"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          title="Enlace (Ctrl+K)"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={addImage}
          title="Insertar imagen"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="p-4 min-h-[500px]">
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .ProseMirror {
          outline: none;
        }
        
        .ProseMirror.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror h1 {
          font-size: 2.25em;
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.75em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror p {
          margin: 0.5em 0;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
        }
        
        .ProseMirror li {
          margin: 0.25em 0;
        }
        
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5em;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25em;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
        
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
          width: 1em;
          height: 1em;
          accent-color: hsl(var(--primary));
        }
        
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1em;
          margin: 1em 0;
          color: hsl(var(--muted-foreground));
        }
        
        .ProseMirror pre {
          background: hsl(var(--secondary));
          border-radius: 0.5em;
          padding: 1em;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .ProseMirror code {
          background: hsl(var(--secondary));
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-size: 0.9em;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 2em 0;
        }
        
        .ProseMirror mark {
          background-color: hsl(var(--neon-gold) / 0.3);
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1em 0;
        }
        
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
