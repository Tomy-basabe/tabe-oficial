import { useEffect, useRef, useCallback } from "react";
import EditorJS, { OutputData, API } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Quote from "@editorjs/quote";
import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import Underline from "@editorjs/underline";
import Table from "@editorjs/table";
import Warning from "@editorjs/warning";
import ImageTool from "@editorjs/image";
import Embed from "@editorjs/embed";

interface EditorJSComponentProps {
  content: OutputData | null;
  onUpdate: (content: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function EditorJSComponent({ 
  content, 
  onUpdate, 
  placeholder = "Escribe '/' para ver comandos o comienza a escribir...",
  readOnly = false
}: EditorJSComponentProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const isReady = useRef(false);

  const initEditor = useCallback(async () => {
    if (!holderRef.current || editorRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      readOnly,
      data: content || undefined,
      autofocus: true,
      tools: {
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: {
            placeholder: "Encabezado",
            levels: [1, 2, 3, 4],
            defaultLevel: 2
          },
          shortcut: "CMD+SHIFT+H"
        },
        list: {
          class: List as any,
          inlineToolbar: true,
          config: {
            defaultStyle: "unordered"
          },
          shortcut: "CMD+SHIFT+L"
        },
        checklist: {
          class: Checklist as any,
          inlineToolbar: true,
          shortcut: "CMD+SHIFT+C"
        },
        quote: {
          class: Quote as any,
          inlineToolbar: true,
          config: {
            quotePlaceholder: "Escribe una cita",
            captionPlaceholder: "Autor"
          },
          shortcut: "CMD+SHIFT+Q"
        },
        code: {
          class: Code as any,
          shortcut: "CMD+SHIFT+K"
        },
        delimiter: {
          class: Delimiter as any,
          shortcut: "CMD+SHIFT+D"
        },
        marker: {
          class: Marker as any,
          shortcut: "CMD+SHIFT+M"
        },
        inlineCode: {
          class: InlineCode as any,
          shortcut: "CMD+SHIFT+I"
        },
        underline: {
          class: Underline as any,
          shortcut: "CMD+U"
        },
        table: {
          class: Table as any,
          inlineToolbar: true,
          config: {
            rows: 3,
            cols: 3
          },
          shortcut: "CMD+SHIFT+T"
        },
        warning: {
          class: Warning as any,
          inlineToolbar: true,
          config: {
            titlePlaceholder: "Título",
            messagePlaceholder: "Mensaje"
          },
          shortcut: "CMD+SHIFT+W"
        },
        image: {
          class: ImageTool as any,
          config: {
            uploader: {
              uploadByUrl(url: string) {
                return Promise.resolve({
                  success: 1,
                  file: { url }
                });
              },
              uploadByFile(file: File) {
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve({
                      success: 1,
                      file: { url: reader.result as string }
                    });
                  };
                  reader.readAsDataURL(file);
                });
              }
            }
          }
        },
        embed: {
          class: Embed as any,
          config: {
            services: {
              youtube: true,
              vimeo: true,
              twitter: true,
              instagram: true,
              codepen: true,
              github: true
            }
          }
        }
      },
      onChange: async (api: API) => {
        if (!isReady.current) return;
        try {
          const outputData = await api.saver.save();
          onUpdate(outputData);
        } catch (error) {
          console.error("Error saving editor content:", error);
        }
      },
      onReady: () => {
        isReady.current = true;
      }
    });

    editorRef.current = editor;
  }, [content, placeholder, readOnly, onUpdate]);

  useEffect(() => {
    initEditor();

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
        isReady.current = false;
      }
    };
  }, [initEditor]);

  // Handle content updates from parent
  useEffect(() => {
    const updateContent = async () => {
      if (editorRef.current && isReady.current && content) {
        try {
          await editorRef.current.isReady;
          // Only render if content is significantly different
          const currentData = await editorRef.current.save();
          if (JSON.stringify(currentData) !== JSON.stringify(content)) {
            await editorRef.current.render(content);
          }
        } catch (error) {
          console.error("Error updating editor content:", error);
        }
      }
    };
    
    // Don't update on initial mount, only on subsequent content changes
    if (isReady.current) {
      updateContent();
    }
  }, [content]);

  return (
    <>
      <div 
        ref={holderRef} 
        id="editorjs"
        className="min-h-[500px] prose prose-invert max-w-none"
      />
      <style>{`
        .codex-editor {
          padding: 2rem 0;
        }
        
        .ce-block__content,
        .ce-toolbar__content {
          max-width: 100%;
        }
        
        .cdx-block {
          padding: 0.5rem 0;
        }
        
        .ce-paragraph {
          line-height: 1.8;
          font-size: 1rem;
        }
        
        .ce-header {
          padding: 0.5rem 0;
        }
        
        h1.ce-header {
          font-size: 2rem;
          font-weight: 700;
        }
        
        h2.ce-header {
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        h3.ce-header {
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        h4.ce-header {
          font-size: 1.1rem;
          font-weight: 500;
        }
        
        .ce-toolbar__plus,
        .ce-toolbar__settings-btn {
          background: hsl(var(--secondary));
          border-radius: 0.5rem;
        }
        
        .ce-toolbar__plus:hover,
        .ce-toolbar__settings-btn:hover {
          background: hsl(var(--accent));
        }
        
        .ce-popover {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        .ce-popover-item {
          border-radius: 0.5rem;
        }
        
        .ce-popover-item:hover {
          background: hsl(var(--secondary));
        }
        
        .ce-popover-item__icon {
          background: hsl(var(--secondary));
          border-radius: 0.5rem;
        }
        
        .ce-inline-toolbar {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }
        
        .ce-inline-tool {
          color: hsl(var(--foreground));
        }
        
        .ce-inline-tool:hover {
          background: hsl(var(--secondary));
        }
        
        .ce-inline-tool--active {
          color: hsl(var(--primary));
        }
        
        .cdx-checklist__item-checkbox {
          background: hsl(var(--secondary));
          border: 2px solid hsl(var(--border));
          border-radius: 0.25rem;
        }
        
        .cdx-checklist__item--checked .cdx-checklist__item-checkbox {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }
        
        .cdx-quote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
        }
        
        .cdx-quote__text {
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        
        .ce-code__textarea {
          background: hsl(var(--secondary));
          color: hsl(var(--foreground));
          border-radius: 0.5rem;
          font-family: 'Fira Code', monospace;
        }
        
        .cdx-warning {
          background: hsl(var(--destructive) / 0.1);
          border: 1px solid hsl(var(--destructive) / 0.3);
          border-radius: 0.75rem;
          padding: 1rem;
        }
        
        .cdx-marker {
          background: hsl(var(--neon-gold) / 0.3);
          padding: 0.1rem 0.2rem;
          border-radius: 0.25rem;
        }
        
        .tc-table {
          border-collapse: collapse;
        }
        
        .tc-row {
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .tc-cell {
          padding: 0.5rem;
          border: 1px solid hsl(var(--border));
        }
        
        .cdx-input {
          background: hsl(var(--secondary));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          color: hsl(var(--foreground));
        }
        
        .cdx-input:focus {
          border-color: hsl(var(--primary));
          outline: none;
        }

        .image-tool {
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .image-tool__image {
          border-radius: 0.5rem;
        }

        .embed-tool {
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .cdx-list {
          padding-left: 1.5rem;
        }

        .cdx-list__item {
          padding: 0.25rem 0;
        }

        .ce-delimiter {
          line-height: 1.6em;
        }

        .ce-delimiter::before {
          content: '***';
          color: hsl(var(--muted-foreground));
          letter-spacing: 0.5em;
        }
      `}</style>
    </>
  );
}

export function getEditorContent(editorRef: EditorJS | null): Promise<OutputData | null> {
  if (!editorRef) return Promise.resolve(null);
  return editorRef.save();
}
