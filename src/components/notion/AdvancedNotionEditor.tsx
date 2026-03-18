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
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { ResizableImage } from "./extensions/ResizableImage";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import BulletList from "@tiptap/extension-bullet-list";
import Blockquote from "@tiptap/extension-blockquote";
import { wrappingInputRule, PasteRule } from "@tiptap/core";
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Link as LinkIcon,
  Highlighter, AlignLeft, AlignCenter, AlignRight,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Maximize, Move,
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
import { TrailingNode } from "./extensions/TrailingNode";
import { SubPage } from "./extensions/SubPageBlock";
import { ColorPicker, HighlightColorPicker } from "./ColorPicker";
import { MathExtension } from "./extensions/MathExtension";
import { ChartExtension } from "./extensions/ChartExtension";
import { MathMenu } from "./MathMenu";
import "tippy.js/dist/tippy.css";

const lowlight = createLowlight(common);

interface AdvancedNotionEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  onActivity?: () => void;
  onSubPageClick?: (pageId: string | null, title: string) => void;
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
  onActivity,
  onSubPageClick,
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
        blockquote: false, // Desactivado para no chocar con el inputRule '> ' del Toggle List
      }),
      Blockquote.extend({
        addInputRules() {
          return [
            wrappingInputRule({
              find: /^"(\s)$/, // Cambio de > a " (comilla seguida de espacio)
              type: this.type,
            }),
          ]
        },
      }).configure({
        HTMLAttributes: { class: "notion-blockquote" },
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
      ResizableImage.configure({
        HTMLAttributes: { class: "notion-image shadow-md" },
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
      TrailingNode,
      Superscript,
      Subscript,
      SubPage,
      MathExtension,
      ChartExtension,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
      if (onActivity) onActivity();
    },
    editorProps: {
      attributes: {
        class: "notion-editor-content prose dark:prose-invert max-w-none focus:outline-none min-h-[300px]",
        spellcheck: "true",
        lang: "es",
      },
      transformPastedText(text) {
        // Normalize line endings and remove excessive whitespace
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, ' ');
      },
      handlePaste: (view, event) => {
        // === IMAGE HANDLING (Storage) ===
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const files = Array.from(event.clipboardData.files);
          const hasImages = files.some(f => f.type.startsWith('image/'));

          if (hasImages) {
            files.forEach(async (file) => {
              if (file.type.startsWith('image/')) {
                // Check file size (e.g., 5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("La imagen es demasiado grande (máx 5MB)");
                  return;
                }

                try {
                  const fileExt = file.name.split('.').pop() || 'png';
                  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                  const filePath = `${fileName}`;

                  const { error: uploadError } = await supabase.storage
                    .from('notion-images')
                    .upload(filePath, file);

                  if (uploadError) throw uploadError;

                  const { data: { publicUrl } } = supabase.storage
                    .from('notion-images')
                    .getPublicUrl(filePath);

                  if (publicUrl && editor) {
                    editor.chain().focus().setImage({ src: publicUrl }).run();
                  }
                } catch (error) {
                  console.error("Error uploading image:", error);
                  toast.error("Error al subir la imagen");
                }
              }
            });
            event.preventDefault();
            return true;
          }
        }

        // === INTERNAL HTML PASTE & BASE64 INTERCEPTION ===
        const html = event.clipboardData?.getData('text/html');
        if (html && html.includes('<img')) {
          // If it contains base64 images, we need to intercept and upload them
          if (html.includes('src="data:image/')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const images = Array.from(doc.querySelectorAll('img[src^="data:image/"]'));

            if (images.length > 0) {
              const uploadPromises = images.map(async (img) => {
                const src = img.getAttribute('src');
                if (!src) return;

                try {
                  // Convert base64 to Blob
                  const response = await fetch(src);
                  const blob = await response.blob();
                  
                  const fileExt = blob.type.split('/')[1] || 'png';
                  const fileName = `paste-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('notion-images')
                    .upload(fileName, blob);

                  if (uploadError) throw uploadError;

                  const { data: { publicUrl } } = supabase.storage
                    .from('notion-images')
                    .getPublicUrl(fileName);

                  if (publicUrl) {
                    img.setAttribute('src', publicUrl);
                    // Remove any style height/width if they are huge
                    img.removeAttribute('width');
                    img.removeAttribute('height');
                  }
                } catch (err) {
                  console.error("Paste image upload failed:", err);
                }
              });

              // We don't necessarily have to block the paste if we want it to be "instant",
              // but for safety, we await so the editor gets the public URLs.
              // Note: For a better UX, we could paste placeholders, but let's try awaiting first.
              Promise.all(uploadPromises).then(() => {
                const cleanHtml = doc.body.innerHTML;
                editor?.chain().focus().insertContent(cleanHtml).run();
              });

              event.preventDefault();
              return true;
            }
          }
          
          // Let Tiptap handle standard HTML pastes natively
          return false;
        }

        // === TEXT PASTE AND PDF CLEANUP ===
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // Clean up common PDF artifacts (multiple spaces, non-breaking spaces)
        const cleanText = text
          .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
          .replace(/ +/g, ' ')
          .trim();

        // If it's short, let Tiptap handle it normally
        if (cleanText.length < 5) return false;

        const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) return false;

        // Heuristic to detect and fix PDF/Word line breaks
        let blocks: { type: 'p' | 'li', content: string }[] = [];
        
        lines.forEach(line => {
          // Detect bullet points (more comprehensive regex)
          const bulletMatch = line.match(/^([•●○◦▪■*-]|\d+[.)])\s+(.*)/);
          if (bulletMatch) {
            blocks.push({ type: 'li', content: bulletMatch[2] });
          } else {
            const lastBlock = blocks[blocks.length - 1];
            
            // Heuristic for merging split sentences:
            // 1. If previous block wasn't a list item
            // 2. AND previous block didn't end with sentence-ending punctuation (., !, ?, :)
            // 3. OR current line starts with lowercase letter or common connecting word
            const endsWithPunctuation = lastBlock && /[.!?:]\s*$/.test(lastBlock.content);
            const startsWithLowercase = /^[a-zâêîôûáéíóúàèìòù]/.test(line);
            const isContinuation = lastBlock && lastBlock.type === 'p' && (!endsWithPunctuation || startsWithLowercase);

            if (isContinuation) {
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

  const [mathMenuOpen, setMathMenuOpen] = useState(false);
  const [mathMenuAnchor, setMathMenuAnchor] = useState<DOMRect | null>(null);

  // Load content when document changes
  useEffect(() => {
    const shouldReload = documentId && documentId !== lastLoadedDocumentIdRef.current;
    if (!shouldReload || !editor || !content) return;
    lastLoadedDocumentIdRef.current = documentId;
    editor.commands.setContent(content);
  }, [documentId, content, editor]);

  // Listener to open math menu via custom event (e.g. from SlashCommands)
  useEffect(() => {
    const handleOpenMenu = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        setMathMenuAnchor(range.getBoundingClientRect());
      }
      setMathMenuOpen(true);
    };

    window.addEventListener('notion-open-math-menu', handleOpenMenu);
    return () => window.removeEventListener('notion-open-math-menu', handleOpenMenu);
  }, []);

  // === Keyboard shortcuts (Notion-style) ===
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          setMathMenuAnchor(range.getBoundingClientRect());
        }
        setMathMenuOpen(prev => !prev);
        return;
      }

      // Close menu on Escape
      if (e.key === 'Escape') {
        setMathMenuOpen(false);
      }

      // === CHART SHORTCUT (Ctrl+Shift+L) ===
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (editor) {
          editor.chain().focus().insertContent({ type: 'chart' }).run();
          toast.success("Gráfico insertado");
        }
        return;
      }

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
        // Alignment: Ctrl+Shift+L (DISABLED for Charts)
        /*
        if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          editor.chain().focus().setTextAlign("left").run();
          return;
        }
        */
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

        // Intercept > + space explicitly for the Details (Toggle List)
        if (textBefore === ">") {
          e.preventDefault();
          editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setDetails().run();
          return;
        }

        if (textBefore === "#") {
          e.preventDefault();
          if ($from.parent.type.name === 'detailsSummary') {
            editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).updateAttributes('detailsSummary', { level: 1 }).run();
          } else {
            editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).setHeading({ level: 1 }).run();
          }
        } else if (textBefore === "##") {
          e.preventDefault();
          if ($from.parent.type.name === 'detailsSummary') {
            editor.chain().focus().deleteRange({ from: $from.pos - 2, to: $from.pos }).updateAttributes('detailsSummary', { level: 2 }).run();
          } else {
            editor.chain().focus().deleteRange({ from: $from.pos - 2, to: $from.pos }).setHeading({ level: 2 }).run();
          }
        } else if (textBefore === "###") {
          e.preventDefault();
          if ($from.parent.type.name === 'detailsSummary') {
            editor.chain().focus().deleteRange({ from: $from.pos - 3, to: $from.pos }).updateAttributes('detailsSummary', { level: 3 }).run();
          } else {
            editor.chain().focus().deleteRange({ from: $from.pos - 3, to: $from.pos }).setHeading({ level: 3 }).run();
          }
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

    const handleClickOutside = (e: MouseEvent) => {
      if (mathMenuOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.notion-math-menu-container')) {
          setMathMenuOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editor, mathMenuOpen]);

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
    <div className="notion-advanced-editor relative">
      <MathMenu 
        open={mathMenuOpen} 
        onOpenChange={setMathMenuOpen} 
        anchorEl={mathMenuAnchor} 
        onSelect={(latex) => {
          // 1. Dispatch event so any active MathNodeView can catch it
          const event = new CustomEvent('notion-insert-math', { detail: latex });
          window.dispatchEvent(event);
          
          // 2. If no one handles it (or even if they do), we might want to insert a new one
          // But actually, if someone handled it, we should probably stop.
          // For simplicity, we'll try to insert a new one ONLY if no math input is focused.
          const activeEl = document.activeElement;
          const isMathInput = activeEl?.classList.contains('notion-math-input');
          
          if (!isMathInput && editor) {
            editor.chain().focus().setMath({ formula: latex }).run();
          }
        }} 
      />
      {/* Bubble Menu — appears on text selection, like real Notion */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="notion-bubble-menu"
      >
        {/* Image specific controls */}
        {editor.isActive("image") && (
          <>
            <BubbleBtn
              onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()}
              isActive={editor.isActive("image", { align: "left" })}
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-4 h-4" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().updateAttributes("image", { align: "center" }).run()}
              isActive={editor.isActive("image", { align: "center" })}
              title="Centrar"
            >
              <AlignCenter className="w-4 h-4" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().updateAttributes("image", { align: "right" }).run()}
              isActive={editor.isActive("image", { align: "right" })}
              title="Alinear a la derecha"
            >
              <AlignRight className="w-4 h-4" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().updateAttributes("image", { align: "full", width: "100%" }).run()}
              isActive={editor.isActive("image", { align: "full" })}
              title="Ancho completo"
            >
              <Maximize className="w-4 h-4" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().updateAttributes("image", { isFloating: !editor.getAttributes("image").isFloating }).run()}
              isActive={editor.getAttributes("image").isFloating}
              title="Movimiento libre"
            >
              <Move className="w-4 h-4" />
            </BubbleBtn>
            <div className="notion-bubble-separator" />
          </>
        )}

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
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive("superscript")}
          title="Superíndice"
        >
          <SuperscriptIcon className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive("subscript")}
          title="Subíndice"
        >
          <SubscriptIcon className="w-4 h-4" />
        </BubbleBtn>

        <div className="notion-bubble-separator" />

        <HighlightColorPicker editor={editor} type="bubble" />

        <ColorPicker editor={editor} type="bubble" />

        <div className="notion-bubble-separator" />

        <BubbleBtn onClick={setLink} isActive={editor.isActive("link")} title="Enlace (Ctrl+K)">
          <LinkIcon className="w-4 h-4" />
        </BubbleBtn>

        <div className="notion-bubble-separator" />

        {/* Block type toggles */}
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Lista de tareas"
        >
          <CheckSquare className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Cita"
        >
          <Quote className="w-4 h-4" />
        </BubbleBtn>

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
    </div>
  );
}
