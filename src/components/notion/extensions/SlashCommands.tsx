import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import tippy, { Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Image,
  Table,
  AlertCircle,
  ChevronRight,
  FileText,
  Lightbulb,
  AlertTriangle,
  Info,
  Sparkles,
  Palette,
  PaintBucket,
  Youtube,
  Twitter,
  Music,
  Video,
  ExternalLink,
  Columns,
  Bookmark,
  Smile,
} from "lucide-react";
import {
  NOTION_TEXT_COLORS,
  NOTION_BACKGROUND_COLORS,
} from "./ColorExtension";

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
  category: string;
  shortcut?: string;
}

const getSuggestionItems = (): CommandItem[] => [
  // Text
  {
    title: "Texto",
    description: "Párrafo de texto normal",
    icon: <Type className="w-4 h-4" />,
    category: "Básico",
    shortcut: "Ctrl+Shift+0",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Encabezado 1",
    description: "Título principal grande",
    icon: <Heading1 className="w-4 h-4" />,
    category: "Básico",
    shortcut: "# espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Encabezado 2",
    description: "Subtítulo mediano",
    icon: <Heading2 className="w-4 h-4" />,
    category: "Básico",
    shortcut: "## espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Encabezado 3",
    description: "Subtítulo pequeño",
    icon: <Heading3 className="w-4 h-4" />,
    category: "Básico",
    shortcut: "### espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  // Lists
  {
    title: "Lista con viñetas",
    description: "Lista desordenada simple",
    icon: <List className="w-4 h-4" />,
    category: "Listas",
    shortcut: "- espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Lista numerada",
    description: "Lista ordenada con números",
    icon: <ListOrdered className="w-4 h-4" />,
    category: "Listas",
    shortcut: "1. espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Lista de tareas",
    description: "Checklist con casillas",
    icon: <CheckSquare className="w-4 h-4" />,
    category: "Listas",
    shortcut: "[] espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Toggle",
    description: "Lista colapsable",
    icon: <ChevronRight className="w-4 h-4" />,
    category: "Listas",
    shortcut: "> espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setDetails().run();
    },
  },
  // Blocks
  {
    title: "Cita",
    description: "Bloque de cita",
    icon: <Quote className="w-4 h-4" />,
    category: "Bloques",
    shortcut: "\" espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: "Código",
    description: "Bloque de código",
    icon: <Code className="w-4 h-4" />,
    category: "Bloques",
    shortcut: "``` Enter",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: "Divisor",
    description: "Línea horizontal separadora",
    icon: <Minus className="w-4 h-4" />,
    category: "Bloques",
    shortcut: "--- espacio",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  // Callouts
  {
    title: "Nota",
    description: "Callout informativo azul",
    icon: <Info className="w-4 h-4 text-blue-400" />,
    category: "Callouts",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run();
    },
  },
  {
    title: "Éxito",
    description: "Callout de éxito verde",
    icon: <Sparkles className="w-4 h-4 text-green-400" />,
    category: "Callouts",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "success" }).run();
    },
  },
  {
    title: "Advertencia",
    description: "Callout de advertencia amarillo",
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    category: "Callouts",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "warning" }).run();
    },
  },
  {
    title: "Peligro",
    description: "Callout de error rojo",
    icon: <AlertCircle className="w-4 h-4 text-red-400" />,
    category: "Callouts",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "danger" }).run();
    },
  },
  {
    title: "Tip",
    description: "Callout de consejo morado",
    icon: <Lightbulb className="w-4 h-4 text-purple-400" />,
    category: "Callouts",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "tip" }).run();
    },
  },
  // Colors - Text
  ...NOTION_TEXT_COLORS.filter(c => c.color).map(color => ({
    title: `Texto ${color.name}`,
    description: `Color de texto ${color.name.toLowerCase()}`,
    icon: <Palette className="w-4 h-4" style={{ color: color.color || undefined }} />,
    category: "Colores",
    command: ({ editor, range }: { editor: any; range: any }) => {
      editor.chain().focus().deleteRange(range).setColor(color.color!).run();
    },
  })),
  // Colors - Background
  ...NOTION_BACKGROUND_COLORS.filter(c => c.color).map(color => ({
    title: `Fondo ${color.name}`,
    description: `Color de fondo ${color.name.toLowerCase()}`,
    icon: <PaintBucket className="w-4 h-4" style={{ color: color.color || undefined }} />,
    category: "Colores",
    command: ({ editor, range }: { editor: any; range: any }) => {
      editor.chain().focus().deleteRange(range).setBackgroundColor(color.color!).run();
    },
  })),
  // Media
  {
    title: "Imagen",
    description: "Insertar imagen desde URL",
    icon: <Image className="w-4 h-4" />,
    category: "Media",
    command: ({ editor, range }) => {
      const url = window.prompt("URL de la imagen:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Tabla",
    description: "Insertar tabla 3x3",
    icon: <Table className="w-4 h-4" />,
    category: "Media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  // Embeds
  {
    title: "YouTube",
    description: "Insertar video de YouTube",
    icon: <Youtube className="w-4 h-4 text-red-500" />,
    category: "Embeds",
    command: ({ editor, range }) => {
      const url = window.prompt("URL del video de YouTube:");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  {
    title: "Twitter / X",
    description: "Insertar tweet",
    icon: <Twitter className="w-4 h-4 text-blue-400" />,
    category: "Embeds",
    command: ({ editor, range }) => {
      const url = window.prompt("URL del tweet:");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  {
    title: "Vimeo",
    description: "Insertar video de Vimeo",
    icon: <Video className="w-4 h-4 text-cyan-500" />,
    category: "Embeds",
    command: ({ editor, range }) => {
      const url = window.prompt("URL del video de Vimeo:");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  {
    title: "Spotify",
    description: "Insertar canción o playlist",
    icon: <Music className="w-4 h-4 text-green-500" />,
    category: "Embeds",
    command: ({ editor, range }) => {
      const url = window.prompt("URL de Spotify (canción o playlist):");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  {
    title: "Embed",
    description: "Insertar cualquier contenido embebido",
    icon: <ExternalLink className="w-4 h-4" />,
    category: "Embeds",
    command: ({ editor, range }) => {
      const url = window.prompt("URL para embeber (YouTube, Vimeo, Spotify, Figma, Loom, CodePen, etc.):");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  // Advanced
  {
    title: "2 Columnas",
    description: "Dividir en 2 columnas",
    icon: <Columns className="w-4 h-4" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColumns(2).run();
    },
  },
  {
    title: "3 Columnas",
    description: "Dividir en 3 columnas",
    icon: <Columns className="w-4 h-4" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColumns(3).run();
    },
  },
  {
    title: "Bookmark",
    description: "Vista previa de enlace web",
    icon: <Bookmark className="w-4 h-4" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      const url = window.prompt("URL del enlace:");
      if (url) {
        editor.chain().focus().deleteRange(range).setBookmark({ url }).run();
      }
    },
  },
  {
    title: "Emoticón",
    description: "Insertar un emoji",
    icon: <Smile className="w-4 h-4 text-pink-400" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      // In a real app we'd open a picker, here let's just insert one for now or a placeholder
      editor.chain().focus().deleteRange(range).insertContent("✨ ").run();
    },
  },
  {
    title: "Tabla de contenidos",
    description: "Índice de encabezados",
    icon: <List className="w-4 h-4 text-primary" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertToc().run();
    },
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback((index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    }, [items, command]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, CommandItem[]>);

    let globalIndex = 0;

    if (items.length === 0) {
      return (
        <div className="slash-menu-empty bg-card border border-border rounded-xl p-4 shadow-xl">
          <p className="text-muted-foreground text-sm">No se encontraron comandos</p>
        </div>
      );
    }

    return (
      <div className="slash-menu bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto min-w-[280px]">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
              {category}
            </div>
            {categoryItems.map((item) => {
              const currentIndex = globalIndex++;
              return (
                <button
                  key={item.title}
                  onClick={() => selectItem(currentIndex)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                    selectedIndex === currentIndex
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-secondary"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    selectedIndex === currentIndex
                      ? "bg-primary/30"
                      : "bg-secondary"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  {item.shortcut && (
                    <span className="flex-shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border) / 0.5)' }}>
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

CommandList.displayName = "CommandList";

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return getSuggestionItems().filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer<CommandListRef>;
          let popup: Instance[];

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate: (props: SuggestionProps) => {
              component.updateProps(props);

              if (!props.clientRect) return;

              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }

              return component.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
