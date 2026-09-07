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
  LayoutGrid,
  FileText as FileTextIcon,
  FileAudio,
  Paperclip,
  Link2,
  LayoutDashboard,
  Kanban,
  GalleryHorizontalEnd,
  ListFilter,
  AtSign,
  Calendar,
  Calculator,
  BarChart3,
  Sigma,
  Keyboard,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
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
  keywords?: string[];
}

export const normalizeSlashText = (str: string): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const getSuggestionItems = (): CommandItem[] => [
  // ========== 1. BLOQUES BÁSICOS ==========
  {
    title: "Guía de Atajos y Comandos",
    description: "Ver todos los atajos de teclado y comandos de Word y Notion",
    icon: <Keyboard className="w-4 h-4 text-primary" />,
    category: "Básico",
    shortcut: "/ayuda",
    keywords: ["ayuda", "atajos", "comandos", "shortcuts", "guia", "teclado", "help"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("notion-open-shortcuts-guide"));
    },
  },
  {
    title: "Texto",
    description: "Párrafo de texto normal",
    icon: <Type className="w-4 h-4" />,
    category: "Básico",
    shortcut: "Ctrl+Shift+0",
    keywords: ["parrafo", "texto", "normal", "p"],
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
    keywords: ["h1", "titulo", "titulo 1", "header 1", "encabezado 1"],
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
    keywords: ["h2", "subtitulo", "subtitulo 2", "header 2", "encabezado 2"],
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
    keywords: ["h3", "subtitulo", "subtitulo 3", "header 3", "encabezado 3"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Lista con viñetas",
    description: "Lista desordenada simple",
    icon: <List className="w-4 h-4" />,
    category: "Básico",
    shortcut: "- espacio",
    keywords: ["bullet", "bullets", "vineta", "vinetas", "puntos", "lista"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Lista numerada",
    description: "Lista ordenada con números",
    icon: <ListOrdered className="w-4 h-4" />,
    category: "Básico",
    shortcut: "1. espacio",
    keywords: ["numero", "numeros", "ordenada", "1.", "numeracion"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Lista de tareas",
    description: "Checklist con casillas",
    icon: <CheckSquare className="w-4 h-4" />,
    category: "Básico",
    shortcut: "[] espacio",
    keywords: ["todo", "task", "checklist", "check", "casillas", "tarea", "tareas", "checkbox"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Desplegable",
    description: "Lista colapsable (toggle)",
    icon: <ChevronRight className="w-4 h-4" />,
    category: "Básico",
    shortcut: "> espacio",
    keywords: ["toggle", "acordeon", "colapsable", "desplegable", "ocultar"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setDetails().run();
    },
  },
  {
    title: "Cita",
    description: "Bloque de cita",
    icon: <Quote className="w-4 h-4" />,
    category: "Básico",
    shortcut: "\" espacio",
    keywords: ["quote", "bloque", "cita", "frase"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: "Divisor",
    description: "Línea horizontal separadora",
    icon: <Minus className="w-4 h-4" />,
    category: "Básico",
    shortcut: "--- espacio",
    keywords: ["hr", "linea", "separador", "barra", "divisor"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Matemáticas",
    description: "Símbolos griegos y fórmulas (KaTeX)",
    icon: <Sigma className="w-4 h-4 text-emerald-500" />,
    category: "Básico",
    shortcut: "Ctrl+M",
    keywords: ["math", "formula", "latex", "ecuacion", "sigma", "matematica", "matematicas"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMath({ formula: "" }).run();
      // Dispatch event to open the menu at the new node's position
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('notion-open-math-menu'));
      }, 50);
    },
  },
  {
    title: "Gráfico Estadístico",
    description: "Barras, dispersión, caja, radar, funciones y más",
    icon: <BarChart3 className="w-4 h-4 text-orange-500" />,
    category: "Básico",
    shortcut: "Ctrl+Shift+L",
    keywords: ["chart", "grafico", "estadistica", "barras", "dispersion", "plot"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({ type: 'chart' }).run();
    },
  },

  // ========== 2. BLOQUES ESTRUCTURALES Y PÁGINAS ==========
  {
    title: "Página",
    description: "Crear sub-página enlazada",
    icon: <FileTextIcon className="w-4 h-4 text-blue-400" />,
    category: "Estructural",
    keywords: ["page", "subpage", "pagina", "subpagina", "apunte", "nota", "enlace"],
    command: ({ editor, range }) => {
      const title = window.prompt("Título de la sub-página:", "Sub-página");
      if (title) {
        editor.chain().focus().deleteRange(range).insertContent({
          type: "subPage",
          attrs: { title, pageId: null },
        }).run();
      }
    },
  },
  {
    title: "Nota",
    description: "Callout informativo azul",
    icon: <Info className="w-4 h-4 text-blue-400" />,
    category: "Estructural",
    keywords: ["callout", "info", "informacion", "nota", "azul"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run();
    },
  },
  {
    title: "Éxito",
    description: "Callout de éxito verde",
    icon: <Sparkles className="w-4 h-4 text-green-400" />,
    category: "Estructural",
    keywords: ["success", "exito", "verde", "logro", "completado"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "success" }).run();
    },
  },
  {
    title: "Advertencia",
    description: "Callout de advertencia amarillo",
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    category: "Estructural",
    keywords: ["warning", "advertencia", "alerta", "aviso", "amarillo", "cuidado"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "warning" }).run();
    },
  },
  {
    title: "Peligro",
    description: "Callout de error rojo",
    icon: <AlertCircle className="w-4 h-4 text-red-400" />,
    category: "Estructural",
    keywords: ["danger", "error", "peligro", "rojo", "alerta"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "danger" }).run();
    },
  },
  {
    title: "Tip",
    description: "Callout de consejo morado",
    icon: <Lightbulb className="w-4 h-4 text-purple-400" />,
    category: "Estructural",
    keywords: ["tip", "consejo", "morado", "idea", "sugerencia"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: "tip" }).run();
    },
  },
  {
    title: "Tabla",
    description: "Insertar tabla 3×3",
    icon: <Table className="w-4 h-4" />,
    category: "Estructural",
    keywords: ["table", "tabla", "cuadricula", "filas", "columnas"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Enlace a página",
    description: "Insertar enlace interno a otra página",
    icon: <Link2 className="w-4 h-4 text-blue-400" />,
    category: "Estructural",
    keywords: ["link", "enlace", "conectar", "subpagina", "pagina"],
    command: ({ editor, range }) => {
      const title = window.prompt("Título de la página a enlazar:");
      if (title) {
        editor.chain().focus().deleteRange(range).insertContent({
          type: "subPage",
          attrs: { title, pageId: null },
        }).run();
      }
    },
  },

  // ========== 3. CONTENIDO MULTIMEDIA ==========
  {
    title: "Imagen",
    description: "Insertar imagen desde URL o archivo",
    icon: <Image className="w-4 h-4" />,
    category: "Media",
    keywords: ["image", "imagen", "foto", "picture", "subir", "img"],
    command: ({ editor, range }) => {
      const url = window.prompt("URL de la imagen:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Video",
    description: "Insertar video desde URL",
    icon: <Video className="w-4 h-4 text-purple-500" />,
    category: "Media",
    keywords: ["video", "youtube", "vimeo", "mp4", "reproductor"],
    command: ({ editor, range }) => {
      const url = window.prompt("URL del video (YouTube, Vimeo, MP4, etc.):");
      if (url) {
        // Check if it's a direct video file or an embed-compatible URL
        const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
        if (isDirectVideo) {
          editor.chain().focus().deleteRange(range).insertContent(
            `<div class="notion-video-wrapper"><video controls src="${url}" style="width:100%;max-width:640px;border-radius:8px;"></video></div>`
          ).run();
        } else {
          editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
        }
      }
    },
  },
  {
    title: "Audio",
    description: "Insertar audio desde URL",
    icon: <FileAudio className="w-4 h-4 text-orange-500" />,
    category: "Media",
    keywords: ["audio", "musica", "podcast", "mp3", "sonido", "spotify"],
    command: ({ editor, range }) => {
      const url = window.prompt("URL del audio (MP3, WAV, OGG, Spotify, etc.):");
      if (url) {
        const isDirectAudio = /\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(url);
        if (isDirectAudio) {
          editor.chain().focus().deleteRange(range).insertContent(
            `<div class="notion-audio-wrapper"><audio controls src="${url}" style="width:100%;max-width:480px;"></audio></div>`
          ).run();
        } else {
          // Spotify or other embed
          editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
        }
      }
    },
  },
  {
    title: "Código",
    description: "Bloque de código formateado",
    icon: <Code className="w-4 h-4" />,
    category: "Media",
    shortcut: "+++ o ``` Enter",
    keywords: ["code", "codigo", "programacion", "script", "terminal", "bloque"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: "Archivo",
    description: "Adjuntar un archivo (subida)",
    icon: <Paperclip className="w-4 h-4 text-gray-400" />,
    category: "Media",
    keywords: ["file", "archivo", "adjunto", "documento", "subir"],
    command: ({ editor, range }) => {
      // Create a file input to select a file
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (file.type.startsWith("image/")) {
              editor.chain().focus().deleteRange(range).setImage({ src: dataUrl }).run();
            } else {
              editor.chain().focus().deleteRange(range).insertContent(
                `<p>📎 <a href="${dataUrl}" download="${file.name}" class="notion-link">${file.name}</a> <span style="color:#9B9B9B;font-size:0.85em;">(${(file.size / 1024).toFixed(1)} KB)</span></p>`
              ).run();
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
  },
  {
    title: "Marcador web",
    description: "Vista previa de enlace web (bookmark)",
    icon: <Bookmark className="w-4 h-4" />,
    category: "Media",
    keywords: ["bookmark", "marcador", "enlace", "link", "web"],
    command: ({ editor, range }) => {
      const url = window.prompt("URL del enlace:");
      if (url) {
        editor.chain().focus().deleteRange(range).setBookmark({ url }).run();
      }
    },
  },
  {
    title: "Galería (2 imágenes)",
    description: "Dos imágenes lado a lado",
    icon: <LayoutGrid className="w-4 h-4 text-cyan-400" />,
    category: "Media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "columnBlock",
        attrs: { columns: 2 },
        content: [
          { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Click aquí e inserta una imagen con /imagen" }] }] },
          { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Click aquí e inserta una imagen con /imagen" }] }] },
        ],
      }).run();
    },
  },
  {
    title: "Galería (3 imágenes)",
    description: "Tres imágenes lado a lado",
    icon: <LayoutGrid className="w-4 h-4 text-cyan-400" />,
    category: "Media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "columnBlock",
        attrs: { columns: 3 },
        content: [
          { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Imagen 1" }] }] },
          { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Imagen 2" }] }] },
          { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Imagen 3" }] }] },
        ],
      }).run();
    },
  },

  // ========== 4. VISTAS DE BASE DE DATOS (Placeholders) ==========
  {
    title: "Vista de tabla",
    description: "Base de datos como tabla",
    icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
    category: "Base de Datos",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      toast.info("🗄️ Vista de tabla — Próximamente", { description: "Las vistas de base de datos estarán disponibles pronto." });
    },
  },
  {
    title: "Vista de tablero",
    description: "Base de datos estilo Kanban",
    icon: <Kanban className="w-4 h-4 text-green-500" />,
    category: "Base de Datos",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      toast.info("📋 Vista de tablero — Próximamente", { description: "Las vistas de base de datos estarán disponibles pronto." });
    },
  },
  {
    title: "Vista de galería",
    description: "Base de datos como galería visual",
    icon: <GalleryHorizontalEnd className="w-4 h-4 text-purple-500" />,
    category: "Base de Datos",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      toast.info("🖼️ Vista de galería — Próximamente", { description: "Las vistas de base de datos estarán disponibles pronto." });
    },
  },
  {
    title: "Vista de lista",
    description: "Base de datos como lista compacta",
    icon: <ListFilter className="w-4 h-4 text-orange-500" />,
    category: "Base de Datos",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      toast.info("📝 Vista de lista — Próximamente", { description: "Las vistas de base de datos estarán disponibles pronto." });
    },
  },

  // ========== 5. INSERCIONES EN LÍNEA ==========
  {
    title: "Mención",
    description: "Mencionar una página o fuente",
    icon: <AtSign className="w-4 h-4 text-blue-400" />,
    category: "Inline",
    command: ({ editor, range }) => {
      const mention = window.prompt("Nombre de la página o fuente a mencionar:");
      if (mention) {
        editor.chain().focus().deleteRange(range).insertContent(
          `<span style="background:hsl(var(--primary)/0.15);color:hsl(var(--primary));padding:0 4px;border-radius:4px;font-weight:500;">@${mention}</span> `
        ).run();
      }
    },
  },
  {
    title: "Fecha",
    description: "Insertar fecha o recordatorio",
    icon: <Calendar className="w-4 h-4 text-red-400" />,
    category: "Inline",
    command: ({ editor, range }) => {
      const today = new Date();
      const formatted = today.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      editor.chain().focus().deleteRange(range).insertContent(
        `<span style="background:hsl(var(--secondary));padding:2px 6px;border-radius:4px;font-size:0.9em;">📅 ${formatted}</span> `
      ).run();
    },
  },
  {
    title: "Emoticón",
    description: "Insertar un emoji",
    icon: <Smile className="w-4 h-4 text-yellow-400" />,
    category: "Inline",
    command: ({ editor, range }) => {
      const emojis = ["😀","😂","🥰","🤔","👍","🎉","🔥","✨","💡","📌","⭐","❤️","🚀","📝","🎯","💪","👀","🤝","📚","🧠"];
      const emoji = window.prompt(`Elige un emoji o escríbelo:\n\n${emojis.join(" ")}`, "✨");
      if (emoji) {
        editor.chain().focus().deleteRange(range).insertContent(emoji + " ").run();
      }
    },
  },

  // ========== 6. COLORES ==========
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

  // ========== 7. AVANZADO (Embeds, Columnas, etc.) ==========
  {
    title: "YouTube",
    description: "Insertar video de YouTube",
    icon: <Youtube className="w-4 h-4 text-red-500" />,
    category: "Avanzado",
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
    category: "Avanzado",
    command: ({ editor, range }) => {
      const url = window.prompt("URL del tweet:");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
  {
    title: "Spotify",
    description: "Insertar canción o playlist",
    icon: <Music className="w-4 h-4 text-green-500" />,
    category: "Avanzado",
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
    category: "Avanzado",
    command: ({ editor, range }) => {
      const url = window.prompt("URL para embeber (YouTube, Vimeo, Spotify, Figma, Loom, CodePen, etc.):");
      if (url) {
        editor.chain().focus().deleteRange(range).setEmbed({ src: url }).run();
      }
    },
  },
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
    title: "4 Columnas",
    description: "Dividir en 4 columnas",
    icon: <Columns className="w-4 h-4" />,
    category: "Avanzado",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColumns(4).run();
    },
  },
  {
    title: "Tabla de contenidos",
    description: "Índice automático de encabezados",
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
          const cleanQuery = normalizeSlashText(query);
          if (!cleanQuery) return getSuggestionItems();

          return getSuggestionItems().filter((item) => {
            const matchTitle = normalizeSlashText(item.title).includes(cleanQuery);
            const matchDesc = normalizeSlashText(item.description).includes(cleanQuery);
            const matchCat = normalizeSlashText(item.category).includes(cleanQuery);
            const matchKeywords = item.keywords?.some((k) =>
              normalizeSlashText(k).includes(cleanQuery)
            );
            return matchTitle || matchDesc || matchCat || matchKeywords;
          });
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
